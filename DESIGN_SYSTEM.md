# Design System - Mini-Pautas

Guia de design system mobile-first para garantir consistência, acessibilidade e performance em todos os dispositivos.

## Índice

- [Breakpoints](#breakpoints)
- [Tokens CSS](#tokens-css)
- [Tipografia](#tipografia)
- [Touch Targets](#touch-targets)
- [Grid & Layout](#grid--layout)
- [Componentes](#componentes)
- [Checklists](#checklists)

---

## Breakpoints

Desenvolvimento **mobile-first** — estilos base para mobile, depois expandir com breakpoints.

| Breakpoint | Mínimo | Uso |
|------------|--------|-----|
| `xs` | 320px | Very small mobile |
| `sm` | 375px | Mobile padrão |
| `md` | 768px | Tablet |
| `lg` | 1024px | Desktop |
| `xl` | 1280px | Wide desktop |

**Uso em Tailwind:**
```html
<!-- Mobile-first: base é mobile, md: para tablet+ -->
<div class="p-4 md:p-6 lg:p-8">
```

---

## Tokens CSS

Todos os valores devem usar tokens definidos em `src/styles/tokens.css`.

### Cores

```css
/* Primary */
--color-primary-{50-900}

/* Secondary */
--color-secondary-{50-900}

/* Neutral */
--color-neutral-{0-900}

/* Semantic */
--color-success
--color-warning
--color-error
--color-info
```

### Espaçamentos

```css
--spacing-{0,1,2,3,4,5,6,8,10,12,16,20,24}
```

| Token | Valor |
|-------|-------|
| `--spacing-1` | 0.25rem (4px) |
| `--spacing-2` | 0.5rem (8px) |
| `--spacing-3` | 0.75rem (12px) |
| `--spacing-4` | 1rem (16px) |
| `--spacing-6` | 1.5rem (24px) |
| `--spacing-8` | 2rem (32px) |

---

## Tipografia

### Tipografia Fluida

Usar variáveis `--fs-*` com `clamp()` para escala fluida entre viewports:

```css
--fs-xs   /* 12px → 14px */
--fs-sm   /* 14px → 16px */
--fs-md   /* 16px → 18px */
--fs-lg   /* 18px → 24px */
--fs-xl   /* 20px → 28px */
--fs-2xl  /* 24px → 32px */
--fs-3xl  /* 30px → 40px */
--fs-4xl  /* 36px → 48px */
```

### Line Heights

```css
--line-height-tight: 1.25;
--line-height-base: 1.35;
--line-height-normal: 1.5;
--line-height-relaxed: 1.75;
```

---

## Touch Targets

Todos os elementos interativos devem ter **mínimo 44×44px** para acessibilidade.

### Classes Tailwind

```html
<button class="min-h-touch min-w-touch">Ação</button>
```

| Classe | Valor |
|--------|-------|
| `min-h-touch` | 2.75rem (44px) |
| `min-w-touch` | 2.75rem (44px) |
| `min-h-touch-lg` | 3rem (48px) |
| `min-w-touch-lg` | 3rem (48px) |

### Componente `.btn`

A classe `.btn` já inclui touch targets por defeito.

---

## Grid & Layout

### Sistema de Grid

| Viewport | Colunas | Classe |
|----------|---------|--------|
| Mobile | 4 | `grid-cols-mobile` |
| Tablet | 8 | `md:grid-cols-tablet` |
| Desktop | 12 | `lg:grid-cols-desktop` |

### Container

```html
<div class="max-w-container mx-auto px-4">
```

| Breakpoint | Max Width |
|------------|-----------|
| md | 720px |
| lg | 1024px |
| xl | 1280px |

---

## Componentes

### Template Base

```html
<div class="cmp-NomeDoComponente">
  <img 
    src="..." 
    alt="descrição" 
    width="600" 
    height="400" 
    loading="lazy" 
  />
  <h3 class="cmp-title">Título</h3>
  <p class="cmp-desc">Descrição sucinta.</p>
  <button class="btn btn-primary" aria-label="Ação">
    Ação
  </button>
</div>
```

```css
.cmp-NomeDoComponente {
  padding: var(--spacing-4);
  display: grid;
  gap: var(--spacing-3);
}

.cmp-NomeDoComponente img {
  width: 100%;
  height: auto;
  aspect-ratio: 16/9;
  object-fit: cover;
}

.cmp-title { 
  font-size: var(--fs-md); 
  line-height: var(--line-height-base); 
}
```

### Header de Componente

Adicionar no topo de cada ficheiro de componente:

```tsx
/*
component-meta:
  name: NomeDoComponente
  description: Breve descrição funcional
  tokens: [--color-primary, --fs-md]
  responsive: true
  tested-on: [360x800, 768x1024, 1440x900]
*/
```

---

## Checklists

### Novo Componente

- [ ] Usa tokens (cores, espaçamento, tipografia)
- [ ] Mobile-first: layout testado em 360×640 e 375×812
- [ ] Toque: botões e links têm target ≥ 44px
- [ ] Responsividade: não quebra layout em retrato/paisagem
- [ ] Imagens: `aspect-ratio`, `srcset`, `loading="lazy"`
- [ ] Acessibilidade: `role`/`aria`, foco acessível, alt text
- [ ] Documentação: meta header adicionado

### QA Rápido (PR Review)

- [ ] Usou tokens
- [ ] Mobile-first verificado
- [ ] Alvos de toque OK
- [ ] Imagens responsivas
- [ ] Acessibilidade básica OK

### Commit Message

```
feat(responsive): criar <NomeDoComponente> com suporte mobile-first e tokens
```

---

## Referências

- [tokens.css](src/styles/tokens.css) — Design tokens
- [tailwind.config.js](tailwind.config.js) — Configuração Tailwind
- [index.css](src/index.css) — Componentes base
