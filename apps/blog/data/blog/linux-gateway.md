---
title: "利用 nftables 搭建 Linux 网关"
author: "zrr1999"
description: "与 OpenWRT 相比，自建 Linux 网关更加灵活，而且可以使用自己熟悉的任何发行版（以 ArchLinux 为例）"
pubDatetime: 2024-08-21
modDatetime: 2024-10-04
tags: ["网络", "路由"]
---

目前，适合个人使用的软路由系统主要包括 iKuai、OpenWRT 和 RouterOS，其中 RouterOS 我没有用过在此不做介绍。
iKuai 性能和稳定性都很不错，但是扩展性比较差，增加功能比较困难，而 OpenWRT 性能和稳定性略逊于 iKuai，
但是扩展性很强，有丰富的插件可以使用，所以许多人都是 iKuai+OpenWRT 双路由方案。
这种方案在初期的时候是可以满足我的需求的，但是目前这种方案对于我来讲已经变得逐渐不好用了，
一方面是各种插件的配置文件散落在系统的各个位置，不利于维护和备份，
另一方面是 OpenWRT 本身阉割了很多 Linux 的功能，比如我一直没有找到方法用 VSCode 连接 OpenWRT 的方法。
综上所述，我决定自建一个 Linux 网关，最开始我其实是想顺便把 iKuai 也给去除掉的，
但是后来发现 iKuai 的许多功能用纯 Linux 实现比较麻烦而且也没什么优势，所以最终方案是 iKuai+ArchLinux 双路由的方案。

## 目录

## 搭建思路

iKuai+ArchLinux 双路由的方案，即 iKuai 作为主路由，主要负责拨号和 DHCP，
ArchLinux 作为旁路由，负责运行各种服务（目前包括 DNS 和代理）。

ArchLinux 相比 OpenWRT 是更加完整的 Linux 系统，我们只需要像使用普通 Linux 一样使用它即可。
实际上，你用其他任何 Linux 发行版都可以，比如 Debian、Ubuntu 等，但是 ArchLinux 的包管理器对我目前使用需求来讲更加方便。

## 搭建方案

我使用的是 ArchLinux，可以使用下面命令安装一些必要的包：

```bash
echo "Initializing pacman keyring"
pacman-key --init
pacman-key --populate archlinux
pacman-key --refresh-keys

echo "Setting up pacman mirrorlist"
pacman -S --noconfirm --needed reflector
reflector --save /etc/pacman.d/mirrorlist --country China --protocol https --latest 5

echo "Installing basic tools"
pacman -S --noconfirm --needed base-devel vim git wget unzip cronie
pacman -S --noconfirm --needed iproute2 dnsutils lsof dhclient termshark

echo "Installing paru"
git clone https://aur.archlinux.org/paru.git
cd paru
makepkg -si
cd ..
rm -rf paru
```

由于 paru 需要使用非 root 用户，所以需要创建一个非 root 用户，然后使用这个用户安装其他所需要的包：

```bash
paru -S --noconfirm --needed go-yq smartdns mosdns-bin metacubexd mihomo
```

详细的配置文件可以参考[我的项目](https://github.com/zrr1999/system-install-scripts)，
你可以通过下面的命令直接使用我的配置文件，也可以根据自己的需求进行修改

```bash
cd /root
git clone https://github.com/zrr1999/system-install-scripts
cd system-install-scripts
sudo cp -r root-gateway/* /
sudo bash /usr/share/mosdns/update.sh
sudo bash /usr/share/mihomo/update.sh
ip rule add fwmark 0x161 lookup 100
ip rule add fwmark 0x162 lookup 100
ip route add local 0.0.0.0/0 dev lo table 100
```

最后使用 systemctl 启动这些服务：

```bash
systemctl enable mosdns
systemctl start mosdns
systemctl enable smartdns
systemctl start smartdns

systemctl enable mihomo
systemctl start mihomo

systemctl enable nftables
systemctl start nftables
```

如果不确定这些服务是否启动成功，可以使用以下命令检查：

```bash
systemctl status mosdns
systemctl status smartdns
systemctl status mihomo
systemctl status nftables
```

有些服务可能需要定期更新（例如国内 IP 库），你可以使用以下命令创建定时任务：

```bash
(crontab -l 2>/dev/null; echo "0 3 1 * * bash /usr/share/mosdns/update.sh") | crontab
(crontab -l 2>/dev/null; echo "3 3 1 * * systemctl restart mosdns") | crontab
(crontab -l 2>/dev/null; echo "6 3 1 * * bash /usr/share/mihomo/update.sh") | crontab
(crontab -l 2>/dev/null; echo "9 3 1 * * systemctl restart mihomo") | crontab
```

## nftables 配置

nftables 的配置文件位于 [`/etc/nftables.conf`](https://github.com/zrr1999/system-install-scripts/blob/main/root-gateway/etc/nftables.conf)，
完整的内容如下：

```conf
#!/usr/sbin/nft -f

flush ruleset

define proxy-ip = {
    # fakeip
    198.18.0.0/16,
    # telegram
    91.108.0.0/16,
    109.239.140.0/24,
    149.154.160.0/20
}

table inet filter {
    chain input {
        type filter hook input priority 0; policy accept;
    }

    chain forward {
        type filter hook forward priority 0; policy accept;
    }

    chain output {
        type filter hook output priority 0; policy accept;
    }
}

table inet nat {
    chain prerouting {
        type nat hook prerouting priority 0; policy accept;

        tcp dport 53 redirect to :5335
        udp dport 53 redirect to :5335
    }

    chain output {
        type nat hook output priority 0; policy accept;

        ip daddr 127.0.0.0/24 tcp dport 53 redirect to :5335
        ip daddr 127.0.0.0/24 udp dport 53 redirect to :5335
    }

    chain postrouting {
        type nat hook postrouting priority 0; policy accept;
    }
}

table ip mangle{
    chain proxy {
        meta mark 0x162 return
        ip daddr $proxy-ip ip protocol {udp, tcp} mark set 0x162 tproxy to 127.0.0.1:7894
    }

    chain proxy_output {
        ip daddr $proxy-ip ip protocol {udp, tcp} mark set 0x161
    }

    chain prerouting {
        type filter hook prerouting priority mangle; policy accept;

        jump proxy
    }

    chain output {
        type route hook output priority mangle;policy accept;

        jump proxy_output
    }
}
```

这里主要做了两件事，转发 DNS 和配置透明代理。

### 转发 DNS

对于本地流量，我们通过 `ip daddr 127.0.0.0/24 tcp dport 53 redirect to :5335` 和 `ip daddr 127.0.0.0/24 udp dport 53 redirect to :5335` 将流量转发到 MosDNS，
对于路由流量，我们通过 `tcp dport 53 redirect to :5335` 和 `udp dport 53 redirect to :5335` 将流量转发到 MosDNS。

### 配置透明代理

对于本地出站流量，我们通过 `ip daddr $proxy-ip ip protocol {udp, tcp} mark set 0x161` 对流量进行标记，`0x161` 表示需要代理的本地出站流量，
因为我们添加了 `ip rule add fwmark 0x161 lookup 100`，这些流量会被重新路由到环回地址进行后续处理。
对于其他流量，我们通过 `ip daddr $proxy-ip ip protocol {udp, tcp} mark set 0x162 tproxy to 127.0.0.1:7894` 直接将流量的透明代理设置成 mihomo，
同样因为我们添加了 `ip rule add fwmark 0x162 lookup 100`，这些流量会被重新路由到环回地址进行后续处理，这样 mihomo 才可以接收到这些流量并进行代理。

> **说明**: 流量标记 `0x162` 用于区分需要透明代理的流量，通过路由表 100 将其重定向到本地环回地址，实现透明代理功能。

## 参考资料

[包的路由转圈圈——谈谈使用nftables配置透明代理碰到的那些坑](https://koswu.github.io/2019/08/19/tproxy-config-with-nftables/)
