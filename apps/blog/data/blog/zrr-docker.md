---
title: "自己搭建的一些 Docker 镜像"
author: "六个骨头"
description: "有些情况下，公开的 Docker 镜像并不满足需求，所以需要自己搭建一些"
pubDatetime: 2025-08-25
modDatetime: 2025-08-25
tags: ["个人服务", "Docker"]
---

## 背景

有些情况下，公开的 Docker 镜像并不满足需求，所以需要自己搭建一些。
我搭建的镜像主要分为以下两类：

- 开发环境
- 个人服务

## 开发环境

## 个人服务

### zrr-caddy

<!-- --with github.com/mholt/caddy-l4 \
--with github.com/caddy-dns/cloudflare \
--with github.com/lucaslorentz/caddy-docker-proxy/v2 \
--with github.com/mholt/caddy-webdav \
--with github.com/pteich/caddy-tlsconsul -->

Caddy 如果需要引入插件，则需要自己编译。
根据我的需求，需要引入下面的插件：

- [caddy-l4](https://github.com/mholt/caddy-l4) caddy 的四层支持。
- [cloudflare](https://github.com/caddy-dns/cloudflare) caddy 的 cloudflare 支持。
- [caddy-docker-proxy](https://github.com/lucaslorentz/caddy-docker-proxy) caddy 的 docker 支持。
- [caddy-webdav](https://github.com/mholt/caddy-webdav) caddy 的 webdav 支持。
- [caddy-tlsconsul](https://github.com/pteich/caddy-tlsconsul) caddy 的 tls 支持。

<!-- - [caddy-dns](https://github.com/caddyserver/dnsproviders) caddy 的 dns 支持。 -->
