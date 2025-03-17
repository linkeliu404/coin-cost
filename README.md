# 加密货币成本监控工具

一个简单易用的加密货币投资组合跟踪和成本监控工具，无需登录即可使用。

## 功能特点

- 跟踪多种加密货币的投资组合
- 记录买入和卖出交易
- 计算平均买入价格和当前盈亏
- 可视化投资组合分布和收益图表
- 无需登录，数据存储在本地浏览器中

## 技术栈

- Next.js 14
- React
- Tailwind CSS
- shadcn/ui 组件库
- Chart.js 图表库

## 本地开发

1. 克隆仓库

```bash
git clone https://github.com/yourusername/coin-cost.git
cd coin-cost
```

2. 安装依赖

```bash
npm install
```

3. 启动开发服务器

```bash
npm run dev
```

4. 在浏览器中访问 http://localhost:3000

## 构建和部署

1. 构建项目

```bash
npm run build
```

2. 启动生产服务器

```bash
npm start
```

## 部署到 Vercel

该项目已配置为可以轻松部署到 Vercel 平台：

1. Fork 或克隆此仓库到你的 GitHub 账户
2. 在 Vercel 上导入项目
   - 访问 [Vercel](https://vercel.com) 并登录
   - 点击 "New Project"
   - 选择你的 GitHub 仓库
   - Vercel 会自动检测 Next.js 项目并设置构建配置
   - 点击 "Deploy" 开始部署
3. 部署完成后，你将获得一个可访问的 URL

### 手动部署

你也可以使用 Vercel CLI 进行部署：

```bash
# 安装 Vercel CLI
npm install -g vercel

# 登录
vercel login

# 部署
vercel
```

## 故障排除

如果在构建过程中遇到问题，请尝试以下步骤：

1. 清除缓存并重新安装依赖

```bash
rm -rf node_modules .next
npm install
```

2. 确保所有 UI 组件都已安装

```bash
npx shadcn@latest add button card dialog tabs input label textarea dropdown-menu tooltip
```

3. 检查 next.config.js 文件是否正确配置

## 许可证

MIT
