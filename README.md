# Prova Easy

Aplicação web estática para montar e padronizar cadernos de prova escolares. A ferramenta permite transformar texto bruto de questões em uma prova organizada, com visual pronto para impressão e recursos de edição no próprio navegador.

## O que é a aplicação

O Prova Easy funciona como um editor de prova com duas áreas principais:

- Painel de configuração da prova (dados institucionais, instruções e template).
- Área de montagem (entrada de questões, organização, disciplina e pré-visualização).

Toda a experiência acontece no navegador, sem backend, com salvamento local automático.

## Recursos suportados hoje

### 1) Configuração geral da prova

- Edição de dados do cabeçalho:
	- Escola
	- Título da prova
	- Série
	- Turma
	- Turno
	- Estudante
	- Data
- Campo de instruções com formatação inline por seleção de texto:
	- Negrito
	- Itálico
	- Sublinhado

### 2) Template

- Seleção de template visual no painel lateral.
- Atualmente existe 1 template disponível:
	- Padrão (cabeçalho institucional e margens limpas).

### 3) Criação e organização de questões

- Entrada de texto bruto da questão.
- Botão Organizar questão para separar automaticamente:
	- Enunciado
	- Alternativas (quando reconhecidas)
- Reconhecimento de alternativas em formatos comuns (A-E e 1-5 com pontuação).
- Suporte a dois modos de resposta por questão:
	- Com alternativas (múltipla escolha)
	- Dissertativa com linhas (1 a 30)
- Ajustes por questão:
	- Tamanho da fonte (10 a 18 px)
	- Alinhamento do enunciado (justificado, esquerda, centro, direita)
	- Colunas do enunciado (1 a 3)
	- Colunas das alternativas (1 a 4 via interface)
- Formatação inline no enunciado (negrito, itálico e sublinhado).
- Marcadores de coluna no enunciado:
	- /col/
	- /endcol/

### 4) Imagens nas questões

- Upload de uma ou mais imagens por questão.
- Compressão e redimensionamento automático para otimização.
- Controle de posição da imagem:
	- Acima do texto
	- Esquerda
	- Direita
	- Abaixo do texto
	- Ao lado das alternativas (esquerda)
	- Ao lado das alternativas (direita)
- Controle de escala da imagem (10% a 300%).
- Pré-visualização das imagens no editor da questão.

### 5) Estrutura da prova por disciplinas

- Inserção de separadores de disciplina ao longo da prova.
- Lista com disciplinas predefinidas.
- Opção Outro para digitar nome personalizado.

### 6) Gestão dos itens da prova

- Adicionar questão à prova.
- Editar questão já adicionada.
- Reordenar itens (mover para cima/baixo).
- Remover questão.
- Remover separador de disciplina.
- Limpar prova inteira.

### 7) Pré-visualização e impressão

- Pré-visualização em tempo real da prova completa.
- Contador de questões (desconsiderando separadores de disciplina).
- Estilos específicos para impressão.
- Ação Imprimir pelo navegador.

### 8) Importação, exportação e persistência

- Exportação em JSON em dois modos:
	- Prova completa
	- Somente questões e disciplinas
- Importação em JSON nos mesmos dois modos.
- Carregamento de questão de exemplo para teste rápido.
- Persistência automática no localStorage do navegador.

## Como executar

Como é uma aplicação estática, basta abrir o arquivo index.html em um navegador moderno.

Também pode ser usado um servidor local simples, se preferir.

## Estrutura do projeto

- index.html: estrutura da interface.
- styles.css: estilos da aplicação e impressão.
- app.js: lógica de edição, parser, renderização, importação/exportação e persistência.