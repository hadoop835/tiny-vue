import { test, expect } from '@playwright/test';

test('自定义内容区渲染', async ({ page }) => {
  page.on('pageerror', (exception) => expect(exception).toBeNull())
  await page.goto('http://localhost:7130/pc/tree/render-content');

  const node = page.getByRole('treeitem', { name: '三级 1-1-1' })
  const customContent1 = node.getByText('Append')
  const customContent2 = node.getByText('Delete')
  const customContent3 = page.locator('span').filter({ hasText: '二级 1-1AppendDelete' }).getByRole('button', { name: 'Append' }).nth(0)
  const customContent4 = page.getByRole('treeitem', { name: '一级 1 Append Delete' }).getByRole('button', { name: 'Append' }).nth(0)
  const appendedNode = page.getByRole('treeitem', { name: 'testtest' })
  for (const item of [customContent1, customContent2, customContent3, customContent4]) {
    await expect(item).toHaveCount(1)
  }

  await customContent1.click()
  await expect(appendedNode).toHaveCount(1)
  await appendedNode.getByRole('button', { name: 'Delete' }).click();
  await expect(appendedNode).toHaveCount(0)
});