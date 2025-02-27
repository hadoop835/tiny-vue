import { test, expect } from '@playwright/test'

test('基本使用,无数据场景', async ({ page }) => {
  page.on('pageerror', (exception) => expect(exception).toBeNull())
  await page.goto('http://localhost:7130/pc/tree-menu/basic-usage')

  const treeMenu = page.locator('#preview .tiny-tree-menu')
  await expect(treeMenu.getByPlaceholder('请输入内容进行筛选')).toBeVisible()
  await expect(treeMenu).toContainText('暂无数据')
})