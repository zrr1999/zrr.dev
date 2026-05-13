---
title: "将 qcow2 镜像导入 incus"
author: "Zhan Rongrui"
description: "许多系统官方只给了 qcow2 镜像的格式，我们需要一些处理才能导入 incus"
pubDatetime: 2024-11-07
modDatetime: 2024-11-07
tags: ["智能家居", "虚拟机"]
---

许多系统官方只给了 qcow2 镜像的格式，我们需要一些处理才能导入 incus，以下以 Home Assistant OS 为例。

## 下载镜像

```bash
wget https://github.com/home-assistant/operating-system/releases/download/13.2/haos_ova-13.2.qcow2.xz
xz -d haos_ova-13.2.qcow2.xz
```

## 创建 metadata.yaml

```bash
cat <<EOF > metadata.yaml
architecture: x86_64
creation_date: $(date +%s)
properties:
  description: Home Assistant OS
  os: HAOS
  version: 13
EOF
tar cf metadata.tar metadata.yaml
```

## 导入镜像

```bash
incus image import metadata.tar haos_ova-13.2.qcow2 --alias haos
```

## 参考资料

- https://nsg.cc/post/2022/import-qcow2-to-lxd/
- https://linuxcontainers.org/incus/docs/main/reference/image_format/
