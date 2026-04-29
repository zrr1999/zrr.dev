---
title: "使用 ArchLinux + Incus 搭建 all in one 的小主机"
author: "zrr1999"
description: "目前最流行的 AIO 方案是 EXSI 和 PVE，但是其实还有一个更加轻量级的方案，只需要一个普通 Linux 的主机即可"
pubDatetime: 2024-10-13
modDatetime: 2024-11-05
tags: ["网络", "路由"]
---

目前最流行的 AIO 方案是 EXSI 和 PVE，但是其实还有一个更加轻量级的方案，只需要一个普通 Linux 的主机即可。
EXSI 方案相对比较封闭，适合追求稳定的玩家，而 PVE 方案更加开放，深受开源发烧友的喜爱。
除了这两种主流的方案，还有 Hyper-V 等一些相对不太普适，仅适合特定的玩家的方案，当然，我现在的方案也是属于小众方案的一种，
即 Linux + Incus 方案。

## 目录

## 适合人群

1. 已经有一台 Linux 主机，并且想把他改造成 all in one 主机
2. 对 Linux 有一定了解，喜欢使用命令行
3. 喜欢开放的系统，或者喜欢特定的 Linux 发行版

可以参考上述的条件判断自己是否适合这套方案。

## 搭建方案

我的主机是一个 7505 的 6 网口机器，装了 8G 的内存，对于大部分需求来讲都够用了，其实完全没必要这么多网口。
操作系统是 ArchLinux，因为他的包管理相对用得比较顺手，但是理论上其他 Linux 发行版也都可以使用。

### 主要实例

目前我只运行了一个 VM 实例（iKuai），其他都是 LXD 的 ArchLinux 容器，相对更加轻量级，并且更加容易维护。

- iKuai：主路由，负责拨号上网，DHCP。
- ArchLinux 网关：负责 DNS 解析，透明代理。
- ArchLinux 网络服务：运行各种 docker 服务，例如 speedtest-tracker, alist 等
- HomeAssistant：智能家居系统，非官方系统，是基于 ArchLinux 搭建的。

### 网口分配

因为网口比较充足，而且还在研究最优的方案，所以目前的分配还比较简陋。
只是将 enp2s0 (eth0) 直接分配给物理机，作为管理口备用，剩下的全部分配给了 iKuai，其中
enp3s0 (eth1)，enp4s0 (eth2)，enp5s0 (eth3) 分别作为 LAN 口，
enp6s0 (eth4)，enp7s0 (eth5) 作为 WAN 口。

> **提示**: 网口直通功能将在后续版本中完善，目前可以通过 Incus 的设备管理功能实现基本的网口分配。

## 具体步骤

> **注意**: 以下步骤假设你已经有一台可以正常运行的 Linux 主机。关于如何安装和配置 ArchLinux 系统，可以参考 [ArchLinux 官方安装指南](https://wiki.archlinux.org/title/Installation_guide)。

首先，我们需要保证有一台可以使用的 Linux 主机，
我使用的是 ArchLinux，可以使用下面命令安装 [incus](https://github.com/lxc/incus)

```bash
sudo pacman -S --noconfirm --needed incus
```

如果你需要一个简单的 Web 管理界面，可以安装 [incus-ui-canonical](https://github.com/KosmX/incus-ui-canonical-arch)，
实际上这是一个 lxc-ui 套壳 ui，并不是专门为 incus 设计的，所以可能会有一些问题

```bash
paru -S --noconfirm --needed incus-ui-canonical
```

incus 的使用可以参考 [Incus 初见](https://silverl.me/posts/hello-incus/) 这个博文。
我这里只介绍一下搭建主机具体的一些操作。

### 搭建 iKuai 主路由

你可以按照下列步骤安装

```bash
wget https://www.ikuai8.com/download.php?n=/3.x/iso/iKuai8_x64_3.7.15_Build202409251708.iso -O iso-ikuai-volume.iso
incus storage volume import default ./iso-ikuai-volume.iso iso-ikuai-volume --type=iso

incus init ikuai --empty --vm -c security.secureboot=false
incus config device add ikuai iso-ikuai-volume disk pool=default source=iso-ikuai-volume boot.priority=1
```

上述代码中的下载地址可能不是最新的，你可以到 [iKuai官网](https://www.ikuai8.com/component/download) 找到最新的 ISO 链接替换。

上述步骤完成后，你可以在 incus-ui 上找到 ikuai 这个实例，点击启动，然后就可以看到 iKuai 的安装界面了，按照提示安装即可。

### 搭建 ArchLinux 网关

这部分内容可以参考我的另一篇文章 [利用 nftables 搭建 Linux 网关](../linux-gateway)。

### 搭建 ArchLinux 网络服务

具体内容参考 [zrr1999/zrr-compose](https://github.com/zrr1999/zrr-compose)。

这个仓库包含了常用的网络服务配置，包括：

- **Speedtest Tracker**: 网络速度测试和监控
- **Alist**: 文件列表程序，支持多种存储
- **其他服务**: 根据需求可以添加更多 Docker 服务

## 总结与展望

通过 ArchLinux + Incus 的方案，我们可以构建一个轻量级、灵活且易于维护的 All-in-One 主机。相比传统的 ESXI 和 PVE 方案：

**优势**：

- 更轻量级，资源占用更少
- 更加开放，可以使用任何 Linux 发行版
- 命令行操作更加灵活
- 容易备份和迁移配置

**劣势**：

- 需要一定的 Linux 基础
- 缺少图形化管理界面（虽然有 incus-ui，但功能有限）
- 社区相对较小，遇到问题可能需要自行解决

如果你符合本文开头提到的适合人群，不妨试试这个方案！

### 搭建基于 ArchLinux 的 HomeAssistant

虽然 HomeAssistant 官方只对 Debian 提供支持，但是实际上在 ArchLinux 上也可以使用，
甚至更加方便，你只需要进行下列操作：

```bash
paru -Sy homeassistant-supervised
su root
pacman -S --noconfirm --needed apparmor
systemctl enable --now hassio-supervisor
systemctl enable --now hassio-apparmor
```

注意：由于是非官方支持，所以可能存在一些意外问题，等我遇到再补充。
