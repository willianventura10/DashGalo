import { expect, test, type Page } from '@playwright/test';

const ROTAS: [string, string][] = [
  ['geral', '#/'],
  ['adversarios', '#/adversarios'],
  ['adversario-cruzeiro', '#/adversarios/MG%20Cruzeiro'],
  ['competicoes', '#/competicoes'],
  ['estadios', '#/estadios'],
  ['publico', '#/publico'],
  ['jogadores', '#/jogadores'],
  ['jogador-reinaldo', '#/jogadores/reinaldo'],
  ['artilheiros', '#/artilheiros'],
  ['tecnicos', '#/tecnicos'],
  ['arbitros', '#/arbitros'],
  ['recordes', '#/recordes'],
  ['jogos', '#/jogos'],
];

function vigiarErros(page: Page) {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(e.message));
  page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));
  return erros;
}

for (const [nome, rota] of ROTAS) {
  test(`tela ${nome}`, async ({ page }, info) => {
    const erros = vigiarErros(page);
    await page.goto(rota);
    await expect(page.locator('main h2, main .numeros').first()).toBeVisible();
    // Nada pode vazar na horizontal (exceto tabelas, que rolam dentro do cartão).
    const vaza = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(vaza, 'página com rolagem horizontal').toBe(false);
    await page.screenshot({ path: `screenshots/${info.project.name}-${nome}.png`, fullPage: true });
    expect(erros).toEqual([]);
  });
}

test('ficha de jogo com escalações', async ({ page }, info) => {
  const erros = vigiarErros(page);
  await page.goto('#/jogos');
  await page.getByRole('searchbox', { name: 'Buscar jogo' }).fill('07/11/2026');
  await page.getByRole('link', { name: /Atlético 1 × 1 Grêmio/ }).click();
  await expect(page.getByRole('heading', { name: /Atlético 1 × 1 Grêmio/ })).toBeVisible();
  await expect(page.getByText('Renan Lodi 25')).toBeVisible();
  await expect(page.getByText('Mateo Cassierra no lugar de Natanael')).toBeVisible();
  await page.screenshot({ path: `screenshots/${info.project.name}-ficha.png`, fullPage: true });
  expect(erros).toEqual([]);
});

test('amistosos ficam fora por padrão e entram pelo filtro', async ({ page }) => {
  await page.goto('#/');
  await expect(page.locator('main .numeros')).toBeVisible();
  // No celular os filtros ficam recolhidos atrás do resumo.
  const resumo = page.locator('.filtros-resumo');
  if (await resumo.isVisible()) await resumo.click();
  const contador = page.locator('.filtros [aria-live]');
  const semAmistosos = Number((await contador.innerText()).replace(/\D/g, ''));
  await page.getByLabel('Incluir amistosos').check();
  await expect(contador).not.toHaveText(`${semAmistosos.toLocaleString('pt-BR')} jogos`);
  const comAmistosos = Number((await contador.innerText()).replace(/\D/g, ''));
  expect(comAmistosos).toBeGreaterThan(semAmistosos + 1000);
  await page.getByRole('button', { name: 'Limpar filtros' }).click();
  await expect(contador).toHaveText(`${semAmistosos.toLocaleString('pt-BR')} jogos`);
});

test('gráfico tem versão em tabela', async ({ page }) => {
  await page.goto('#/');
  await page.getByRole('button', { name: 'Ver tabela' }).first().click();
  await expect(page.getByRole('table', { name: 'Retrospecto por período' })).toBeVisible();
});

test('busca de jogador leva à página dele', async ({ page }) => {
  const erros = vigiarErros(page);
  await page.goto('#/jogadores');
  await page.getByRole('searchbox', { name: 'Buscar jogador' }).fill('joão leite');
  await page.getByRole('link', { name: 'João Leite' }).first().click();
  await expect(page.getByRole('heading', { name: 'João Leite' })).toBeVisible();
  await expect(page.getByText('Como titular')).toBeVisible();
  await expect(page.getByText('Casa × fora')).toBeVisible();
  expect(erros).toEqual([]);
});

test('jogador inexistente mostra orientação', async ({ page }) => {
  await page.goto('#/jogadores');
  await page.getByRole('searchbox', { name: 'Buscar jogador' }).fill('xyzw');
  await expect(page.getByText(/Nenhum jogador com/)).toBeVisible();
});
