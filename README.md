# Painel Lattes – Nilson Clementino Ferreira

Painel interativo gerado a partir do currículo Lattes em PDF (91 páginas, gerado em 18/10/2026).
Site estático (HTML, CSS e JavaScript): basta abrir `index.html` ou publicar no GitHub Pages.

## Seções
Visão geral · Produção (tabela filtrável e exportável) · Orientações e bancas · Trajetória e perfil · Projetos · Mapa.

## Mapa
Mapa próprio sobre ladrilhos gratuitos que não exigem chave de API (OpenStreetMap, Esri e OpenTopoMap), sem biblioteca externa e sem chave de API.
Páginas abertas direto do disco (file://) usam o Esri, pois o servidor do OpenStreetMap bloqueia esse caso; no GitHub Pages o padrão é o OpenStreetMap. É preciso internet para carregar o mapa-base; os pontos funcionam sem ela. Para uso intenso, respeite as políticas de uso de cada provedor de ladrilhos.

## Publicar no GitHub Pages
1. Envie o conteúdo desta pasta para um repositório.
2. Settings → Pages → Branch `main`, pasta `/ (root)`.

## Atualizar os dados
Os dados estão em `assets/js/data.js` (`window.LATTES`), extraídos do PDF. Um novo PDF exige nova extração.

## Observações
- Capítulos de livros: os 65 itens do Lattes são contados (5 avulsos + 60 da série "Diagnóstico técnico participativo", 2020, em 30 comunidades, 2 capítulos cada). No gráfico por ano a série aparece em cor própria. Apenas a análise de coautores e de temas recorrentes continua sem a série, para que ela não domine esses rankings.
- Coautores foram agrupados por sobrenome e inicial; pode haver homônimos.
- Localizações no mapa são aproximadas (campus ou centro urbano).
- O site traz `noindex`; os dados são os do currículo público.
