# Amberpine

生成静态博客站点的程序。

## 安装

全局安装：

```bash
> npm install amberpine -g
```

本地安装：

```bash
> mkdir myblog
> cd myblog
> npm install amberpine --save-dev
```

## 初始化

```bash
> abp i # 全局安装
> node_modules/.bin/abp i # 本地安装
```

在当前目录下生成结构：
1. `source` 目录存放博客文章列表。
2. `assets` 目录中存放静态资源，包含一个必须的 `index.css` 文件，可修改此文件来改变样式。

## 写作

```bash
> abp d
```

参考 `source/first-post` 目录中的 `yaml` 文件和 `md` 文件进行写作。文章编辑保存时，浏览器会自动刷新以体现最新的进展。

## 构建

```bash
> abp
```

执行此命令将在 dist 目录下生成完整的站点，包含一个首页 `index.html` 和每篇文章的一个 `html` 页。

## 发布

一般情况下，将 dist 目录作为根目录完整地发布到任何静态文件服务器即可。一个常用的选择是 [github-pages](https://pages.github.com/)。可以使用 [travis-ci](https://docs.travis-ci.com/user/deployment/pages/) 来完成构建。

```yml
language: node_js
node_js:
  - 9.11.2
script:
  - npm install amberpine
  - node_modules/.bin/abp
  - cp .nojekyll dist # 此文件是为了防止 githuh-pages 将仓库当做 jekyll 项目来构建，如果你没有使用 gitub-pages，可删除此文件。
branches:
  only:
  - source # 文章的源文件（md 文件）放在这个分支上
deploy:
  provider: pages
  local_dir: dist
  skip_cleanup: true
  github_token: $GITHUB_TOKEN # 在 Travis-CI 上设置 GITHUB_TOKEN，参考上面引用的 travis-ci 教程
  on:
    branch: source
  target_branch: gh-pages # 对项目主页来说通常是 gh-pages 分支，但对个人/组织主页来说，通常是 master 分支
```

## 示例站点

[此工具的作者的博客](https://xieguanglei.github.io)

