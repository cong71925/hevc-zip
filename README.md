# hevc-zip

一个使用HEVC编码进行图像有损压缩的程序，基于Ffmpeg + Electron + Vue

![GitHub package.json version (branch)](https://img.shields.io/github/package-json/v/cong71925/hevc-zip/main)
![GitHub all releases](https://img.shields.io/github/downloads/cong71925/hevc-zip/total?link=https%3A%2F%2Fgithub.com%2Fcong71925%2Fhevc-zip%2Freleases)
![GitHub License](https://img.shields.io/github/license/cong71925/hevc-zip)

## 下载发行版
[Releases](https://github.com/cong71925/hevc-zip/releases)

## 使用说明
- 使用硬件编码器时请确认使用环境对应硬件及其HEVC编码器，否则可能导致压缩失败
- 硬件编码器在进行分辨率非常大的图像编码时可能会出现错误，如4K、8K以上，如果压缩失败，请禁用硬件编码使用软件编码器
- 由于Ffmpeg的限制，即使是使用软件编码器的情况下，在进行像素点超过2 ^ 31 / 8 - 1，约为16384 * 16384的图像编码时会出现错误

## 实现原理
1. 遍历待压缩的图像，按照不同的分辨率，格式，位深等分成不同的视频轨道，并将原文件的相对路径，文件名，分轨信息等写入index.json中
2. 调用Ffmpeg依次对视频轨道使用h.265编码
3. 将编码好的各视频轨道与index.json使用mkv封装

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) + [TypeScript Vue Plugin (Volar)](https://marketplace.visualstudio.com/items?itemName=Vue.vscode-typescript-vue-plugin)

## Project Setup

### Install

```bash
$ pnpm install
```

### Development

```bash
$ pnpm dev
```

### Build

```bash
# For windows
$ pnpm build:win

```
## LICENSE

[GPLv3](LICENSE)
