---
title: "使用 Rathole 进行内网穿透"
author: "六个骨头"
description: "租用一个带有公网的高性能服务器成本过高，所以通常许多个人服务会部署在内网的个人电脑上，然后通过内网穿透暴露到公网"
pubDatetime: 2025-08-30
modDatetime: 2025-08-30
tags: ["个人服务", "内网穿透"]
---

租用一个带有公网的高性能服务器成本过高，
所以通常许多个人服务会部署在内网的个人电脑上，
然后通过内网穿透暴露到公网。

## 基础用法

rathole 是一个用 Rust 编写的安全、稳定且高性能的反向代理工具，
它可以用来将内网的服务暴露到公网。

Caddy(Public) -> Rathole Server -> Rathole Client -> Caddy(Private)

Caddy(Public) -> |
reverse proxy to Public Services
reverse proxy(L4) to Rathole Server
