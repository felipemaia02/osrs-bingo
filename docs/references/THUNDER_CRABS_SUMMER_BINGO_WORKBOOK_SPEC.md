# Thunder Crabs - SummerBingo - AstralStar.xlsx
## Descrição funcional e estrutural do arquivo de origem

> Este documento descreve **o arquivo Excel existente**, suas abas, dados, fórmulas, regras e dependências internas. Ele não define arquitetura de software, banco de dados, API ou interface futura. O objetivo é servir como contexto de origem para desenvolvimento assistido por IA, permitindo que a planilha seja entendida antes de qualquer implementação.

---

## 1. Visão geral do arquivo

O arquivo `Thunder Crabs - SummerBingo - AstralStar.xlsx` implementa e acompanha um evento de bingo de Old School RuneScape (OSRS) para uma equipe chamada **Thunder Crabs**.

A pasta de trabalho possui quatro abas:

1. `Board`
2. `Tile Breakdown`
3. `Individual Stats`
4. `Accepted Drops`

As quatro abas não são independentes. Elas formam um fluxo de dados:

```text
Individual Stats
    |
    | submissões digitadas no formato "Categoria - Drop"
    v
Accepted Drops
    |
    | COUNTIF conta os drops e calcula o progresso dos tiles
    v
Board
    |
    | exibe progresso visual, tiles completos e pontuação
    |
    +-------------------------+
    |
    v
Tile Breakdown
    |
    | reorganiza as submissões por tile e jogador
    v
visão de auditoria/leitura
```

A aba `Individual Stats` funciona como a principal entrada manual de dados. A aba `Accepted Drops` interpreta essas entradas e executa a maior parte dos cálculos. `Board` transforma os resultados em uma representação visual e calcula o placar do bingo. `Tile Breakdown` reorganiza os registros para mostrar quais jogadores contribuíram com quais drops em cada categoria.

---

# 2. Aba `Board`

## 2.1 Finalidade

`Board` é a visão principal do bingo. Ela contém:

- o tabuleiro principal 6x6;
- seis categorias de bônus;
- o placar geral (`Points Tally`);
- as regras textuais do evento;
- uma área inferior de cálculo da pontuação dos tiles, linhas, colunas e bônus.

A planilha utiliza fórmulas `IMAGE(...)` com URLs externas hospedadas em `https://summerbingo.s.gy/` para representar visualmente o estado de cada tile.

---

## 2.2 Tabuleiro principal

O tabuleiro possui **6 linhas x 6 colunas**, totalizando **36 tiles principais**.

As imagens principais aparecem nas colunas:

```text
C, H, M, R, W, AB
```

E nas linhas:

```text
13, 18, 23, 28, 33, 38
```

Cada posição consulta uma célula de progresso e uma célula de objetivo da aba `Accepted Drops`.

Quando o progresso ainda é menor que o requisito, o `Board` carrega uma imagem cujo endereço incorpora o progresso atual. Exemplo conceitual:

```text
https://summerbingo.s.gy/angel0
https://summerbingo.s.gy/angel1
https://summerbingo.s.gy/angel2
...
```

Quando o requisito é alcançado, a imagem muda para uma versão `CompleteLow`, `CompleteMed` ou `CompleteHigh`, de acordo com a dificuldade.

Exemplo real da fórmula de Mad Angel:

```excel
=IF(
  'Accepted Drops'!J3 >= 'Accepted Drops'!L3,
  IMAGE("https://summerbingo.s.gy/angelCompleteLow",2),
  IMAGE("https://summerbingo.s.gy/angel" & 'Accepted Drops'!J3,2)
)
```

Portanto, o estado visual do tabuleiro é derivado do progresso calculado em `Accepted Drops`.

---

## 2.3 Tiles principais e metadados observados

As dificuldades do arquivo são:

- `Low` / Easy -> **5 pontos de placar**;
- `Mid` / Medium -> **10 pontos de placar**;
- `High` / Hard -> **20 pontos de placar**.

O campo **Requisito** abaixo não representa pontos do placar. Ele representa a quantidade ponderada de progresso necessária para considerar aquele tile completo.

| Linha | Coluna | Tile | Tier | Pontos no placar | Requisito de progresso |
|---:|---:|---|---|---:|---:|
| 1 | 1 | Mad Angel | Low | 5 | 6 |
| 1 | 2 | Hueycoatl | Low | 5 | 8 |
| 1 | 3 | Grotesque Guardians | Mid | 10 | 8 |
| 1 | 4 | Tormented Demons | Mid | 10 | 3 |
| 1 | 5 | Cerberus | High | 20 | 6 |
| 1 | 6 | Chambers of Xeric | High | 20 | 4 |
| 2 | 1 | Medium Boots | Mid | 10 | 5 |
| 2 | 2 | Yama | High | 20 | 3 |
| 2 | 3 | Tempoross | Low | 5 | 10 |
| 2 | 4 | Theatre of Blood | High | 20 | 4 |
| 2 | 5 | Mortimer | Mid | 10 | 15 |
| 2 | 6 | Demonic Gorillas | Mid | 10 | 10 |
| 3 | 1 | God Wars Dungeon | High | 20 | 18 |
| 3 | 2 | Vorkath | Mid | 10 | 8 |
| 3 | 3 | Tombs of Amascut | High | 20 | 4 |
| 3 | 4 | GOTR | Low | 5 | 10 |
| 3 | 5 | Phantom Muspah | Mid | 10 | 5 |
| 3 | 6 | Royal Titans | Low | 5 | 10 |
| 4 | 1 | Wintertodt | Low | 5 | 1 |
| 4 | 2 | Araxxor | High | 20 | 12 |
| 4 | 3 | Zulrah | Mid | 10 | 6 |
| 4 | 4 | Armoured Zombies | Low | 5 | 8 |
| 4 | 5 | Doom of Mokhaiotl | High | 20 | 3 |
| 4 | 6 | Abyssal Sire | Mid | 10 | 5 |
| 5 | 1 | Alchemical Hydra | High | 20 | 6 |
| 5 | 2 | Zalcano | Mid | 10 | 1 |
| 5 | 3 | Scurrius | Low | 5 | 10 |
| 5 | 4 | Gauntlet | Mid | 10 | 6 |
| 5 | 5 | Skilling Tools | Low | 5 | 10 |
| 5 | 6 | Maggot King | High | 20 | 2 |
| 6 | 1 | Thieving | Mid | 10 | 3 |
| 6 | 2 | Barrows | Low | 5 | 12 |
| 6 | 3 | DT2 Bosses | High | 20 | 12 |
| 6 | 4 | Wilderness Trio | High | 20 | 10 |
| 6 | 5 | Dagannoth Kings | Mid | 10 | 15 |
| 6 | 6 | Moons of Peril | Low | 5 | 8 |

Distribuição observada:

```text
Low:   11 tiles = 55 pontos
Mid:   13 tiles = 130 pontos
High:  12 tiles = 240 pontos

Total dos 36 tiles principais = 425 pontos
```

---

## 2.4 Pontuação de tile

Na região inferior da aba `Board`, cada tile possui uma fórmula que verifica se:

```text
progresso_atual >= requisito
```

Se verdadeiro, a célula retorna os pontos correspondentes ao tier; caso contrário, retorna vazio.

Exemplos:

```excel
=IF('Accepted Drops'!J3 >= 'Accepted Drops'!L3, 5, "")
```

```excel
=IF('Accepted Drops'!AX3 >= 'Accepted Drops'!AZ3, 20, "")
```

Assim, progresso parcial não adiciona pontos de tile ao placar principal.

---

## 2.5 Bônus de linhas e colunas

Depois das seis pontuações de uma linha do board, existe uma célula que verifica se todos os seis tiles daquela linha foram concluídos.

A fórmula armazenada no arquivo concede **30 pontos** por linha completa.

Exemplo:

```excel
=IF(
  (C55<>"") + (H55<>"") + (M55<>"") +
  (R55<>"") + (W55<>"") + (AB55<>"") = 6,
  30,
  ""
)
```

O mesmo padrão existe para as seis colunas.

Portanto, existem até:

```text
6 bônus de linha
6 bônus de coluna
```

### Inconsistência importante

O texto de regras da própria aba informa **40 pontos por linha ou coluna completa**, enquanto as fórmulas de cálculo retornam **30 pontos**.

Isso deve ser tratado como uma inconsistência do arquivo de origem, não como uma decisão a ser inferida automaticamente.

---

## 2.6 Categorias bônus exibidas no Board

Abaixo do board principal existem seis imagens adicionais, uma para cada categoria bônus:

1. Nex
2. Nightmare
3. MegaRares
4. Jar/Pet
5. Fortis Colosseum / Colosseum
6. Corporeal Beast

As imagens de bônus também são carregadas dinamicamente a partir do valor calculado em `Accepted Drops`, por exemplo:

```excel
=IMAGE("https://summerbingo.s.gy/nex" & 'Accepted Drops'!AO69,2)
```

Cada categoria bônus é limitada a **20 pontos** pela fórmula da aba `Accepted Drops`.

---

## 2.7 `Points Tally`

A célula `AJ10` exibe uma string no formato:

```text
Points Tally: <valor>
```

Ela referencia `AF53`, que soma:

- os 36 valores dos tiles principais;
- os 6 bônus de linha;
- os 6 bônus de coluna;
- os 6 valores das categorias bônus.

No estado atual do arquivo, o valor armazenado é:

```text
Points Tally: 2
```

Esse valor vem atualmente do bônus `Jar/Pet`.

---

# 3. Regras textuais existentes no `Board`

A seção `RULESET AND POINTS`, localizada a partir de `AK16`, contém as regras de negócio escritas do evento.

O conteúdo estabelece, em essência:

- Easy Tiles / amarelos valem 5 pontos;
- Medium Tiles / laranjas valem 10 pontos;
- Hard Tiles / vermelhos valem 20 pontos;
- o texto declara 40 pontos por linha ou coluna completa;
- `Accepted Drops` contém os drops válidos e o peso de cada um para conclusão do tile;
- ultrapassar o requisito de progresso de um tile não gera pontuação adicional de tile;
- tiles marcados com `✅` exigem screenshots de pré-verificação antes de submissões serem aceitas;
- categorias bônus existem para recompensar PvM e uniques adicionais;
- jar, pet ou megarare pode contribuir simultaneamente para o tile principal e gerar pontos bônus;
- apenas uma ocorrência por equipe de alguns jars/pets específicos pode gerar bônus;
- cada categoria bônus tem limite de 20 pontos;
- vestiges dos DT2 bosses exigem screenshots adicionais de dois conjuntos de gold ring drops: um de 1x gold ring e outro de 2x gold rings;
- Mortimer é apenas o tema, e as tasks podem ser provenientes de qualquer Slayer Master;
- double pickpocket com Rogue's set não gera completions adicionais;
- a Fletching Knife comprada na loja de Vale Totems não conta, pois não produz a game notification necessária.

Os itens explicitamente limitados a uma ocorrência por equipe para bônus são:

- Chompy Chick;
- Beef;
- Skotos;
- Pet Chaos Elemental;
- Jar of Dirt;
- Jar of Light;
- Jar of Darkness.

---

# 4. Aba `Accepted Drops`

## 4.1 Finalidade

`Accepted Drops` é a aba responsável por definir:

- quais drops são aceitos;
- qual categoria/tile cada drop pertence;
- taxa de drop (`RATE`);
- peso interno (`POINTS`) do drop;
- quantidade de vezes que o drop aparece nas submissões;
- progresso acumulado do tile;
- requisito de conclusão do tile;
- cálculos auxiliares de balanceamento;
- cálculo das seis categorias bônus;
- uma tabela achatada usada pelo cálculo de contribuição individual e pelos dropdowns de submissão.

É a principal referência de regras quantitativas do arquivo.

---

## 4.2 Organização da área principal

Os 36 tiles são distribuídos em seis blocos horizontais.

Os blocos começam nas colunas:

```text
C
M
W
AG
AQ
BA
```

Cada bloco ocupa aproximadamente dez colunas e segue um padrão equivalente a:

```text
[NOME DO TILE]

UNIQUE        ...        RATE        ...        POINTS
<drop>                   <rate>                 <peso>
<drop>                   <rate>                 <peso>
...
```

Para cada drop existe também uma coluna de contagem calculada por `COUNTIF`, consultando todas as submissões em:

```text
'Individual Stats'!N3:AV37
```

Exemplo simplificado:

```excel
=COUNTIF('Individual Stats'!$N$3:$AV$37, "*" & C5 & "*")
```

O progresso do tile é uma soma ponderada:

```text
quantidade_do_drop_1 * peso_1
+ quantidade_do_drop_2 * peso_2
+ ...
```

Exemplo de Mad Angel:

```excel
=SUM(G5*K5,G6*K6,G7*K7)
```

O resultado é exibido no formato conceitual:

```text
progresso / requisito
```

Exemplo:

```text
3 / 8
```

---

## 4.3 Diferença entre `POINTS` de drop e pontos do Board

O campo `POINTS` dentro de `Accepted Drops` não é, em geral, a pontuação concedida diretamente ao placar do time.

Ele representa o **peso de progresso** daquele drop dentro do tile.

Exemplo conceitual:

```text
Tile: Grotesque Guardians
Tier: Mid
Valor no Board: 10
Requisito: 8

Granite Maul              = 1 unidade de progresso
Granite Hammer            = 2 unidades de progresso
Jar of Stone              = 3 unidades de progresso
Noon                      = 3 unidades de progresso
```

Somente quando a soma ponderada chega a 8 o `Board` libera os 10 pontos do tile.

---

## 4.4 Campos `eKC` e `eTTC`

A aba possui diversas células auxiliares chamadas `eKC` e `eTTC`.

Pelas fórmulas observadas:

- `eKC` estima uma quantidade esperada de kills/rolls para atingir o requisito com base nas probabilidades e pesos;
- `eTTC` deriva de `eKC` dividido por uma taxa de kills/ações por unidade de tempo definida na própria fórmula.

Esses campos parecem ter finalidade de **balanceamento dos tiles**, e não de registro operacional das submissões.

Existem também campos como `Hours per bingo point` em algumas seções.

---

# 5. Categorias bônus em `Accepted Drops`

As categorias bônus começam na região da linha 69.

A fórmula de cada categoria soma:

```text
quantidade registrada * valor do bônus
```

E aplica um teto de 20:

```excel
=IF(SUM(...)>20,20,SUM(...))
```

## 5.1 Jar/Pet

Valor observado:

| Tipo | Pontos |
|---|---:|
| Jar | 2 |
| Pet | 2 |

O resultado calculado fica em `K69`.

---

## 5.2 MegaRares

| Unique | Pontos |
|---|---:|
| Twisted Bow | 10 |
| Scythe of Vitur | 10 |
| Tumeken's Shadow | 10 |

O resultado calculado fica em `U69`.

---

## 5.3 Nightmare

| Unique | Pontos |
|---|---:|
| Nightmare staff | 2 |
| Inquisitor's great helm | 2 |
| Inquisitor's hauberk | 2 |
| Inquisitor's plateskirt | 2 |
| Inquisitor's mace | 2 |
| Eldritch orb | 2 |
| Harmonised orb | 4 |
| Volatile orb | 2 |
| Jar of Dreams | 4 |
| Little Nightmare | 4 |

O resultado calculado fica em `AE69`.

---

## 5.4 Nex

| Unique | Pontos |
|---|---:|
| Zaryte vambraces | 3 |
| Nihil horn | 3 |
| Torva full helm | 3 |
| Torva platebody | 3 |
| Torva platelegs | 3 |
| Ancient hilt | 5 |
| Nexling | 5 |

O resultado calculado fica em `AO69`.

---

## 5.5 Corporeal Beast

| Unique | Pontos |
|---|---:|
| Spectral sigil | 6 |
| Arcane sigil | 6 |
| Elysian sigil | 6 |
| Jar of spirits | 6 |
| Pet Dark Core | 6 |

O resultado calculado fica em `AY69`.

---

## 5.6 Fortis Colosseum

| Unique | Pontos |
|---|---:|
| Sunfire fanatic helm | 0.5 |
| Sunfire fanatic cuirass | 0.5 |
| Sunfire fanatic chausses | 0.5 |
| Tonalztics of ralos | 1 |
| Echo crystal(s) (1-3) | 0.5 |
| Smol Heredit | 1 |

O resultado calculado fica em `BI69`.

---

# 6. Tabela auxiliar achatada em `Accepted Drops`

A partir da linha 83 existe uma segunda representação dos drops.

Cabeçalhos principais observados:

```text
B83  Drop
H83  Tier
K83  Pt
L83  Complete
O83  Individual
R83  Contribution
```

O intervalo de opções vai de aproximadamente:

```text
B84:R328
```

São **245 entradas** de submissão possíveis, incluindo tiles principais e categorias bônus.

A coluna `Drop` concatena categoria e unique no padrão:

```text
<Categoria> - <Drop>
```

Exemplos:

```text
Mad Angel - Hallowfell
Mad Angel - Jar of Light
Hueycoatl - Tome of Earth
Grotesque Guardians - Granite Maul
Tormented Demons - Tormented Synapse
...
Jar/Pet - Jar
Jar/Pet - Pet
```

Essa string é exatamente o formato utilizado na aba `Individual Stats`.

---

## 6.1 Cálculo de contribuição individual

Para tiles principais, a tabela auxiliar calcula:

```text
Contribution = Individual / Complete * Pt
```

Onde:

- `Individual` = peso de progresso daquele drop;
- `Complete` = requisito de progresso do tile;
- `Pt` = valor do tile no placar (5, 10 ou 20).

Exemplo real:

```text
Grotesque Guardians - Granite Maul
Tier         = Mid
Pt           = 10
Complete     = 8
Individual   = 1
Contribution = 1 / 8 * 10 = 1.25
```

Para categorias bônus, `Contribution` corresponde diretamente ao valor do bônus daquela entrada.

---

## 6.2 Named range `Tiles`

O workbook possui um named range chamado:

```text
Tiles
```

Ele aponta para:

```excel
'Accepted Drops'!$B$84:$B$328
```

Esse named range é utilizado como lista de opções de submissão na aba `Individual Stats`.

---

# 7. Aba `Individual Stats`

## 7.1 Finalidade

Essa aba contém:

- lista de membros;
- controles de pré-verificação;
- pontuação/contribuição individual calculada;
- quantidade de contribuições/submissões;
- até 35 campos de submissão por membro.

O intervalo tabular principal é:

```text
A2:AV37
```

E existe uma Excel Table chamada:

```text
Table3
```

cobrindo esse mesmo intervalo.

---

## 7.2 Cabeçalhos

### Coluna A

```text
Members
```

Contém o RSN/nome de cada membro.

### Colunas B:K — `P R E - V E R I F I C A T I O N`

Os dez tipos de pré-verificação são:

```text
B  WT
C  Tempo
D  Clues
E  GOTR
F  Yama
G  Blood Shard
H  Teleport Seed
I  Chisel
J  Hammer
K  Knife
```

Essas células possuem validação com as opções:

```text
✅
❌
```

Na prática, o arquivo atual utiliza principalmente `✅` ou célula vazia.

### Coluna L

```text
Points
```

É a soma das contribuições individuais de todas as submissões do jogador.

A fórmula de cada jogador percorre `N:AV`, procura cada string de submissão na tabela auxiliar `Accepted Drops!B84:R328` e retorna a coluna de contribuição.

Estrutura real da fórmula:

```excel
SUM(
  IF(
    N3:AV3="",
    0,
    IFERROR(
      VLOOKUP(N3:AV3,'Accepted Drops'!$B$84:$R$328,17,FALSE),
      0
    )
  )
)
```

Consequentemente, `Points` nessa aba significa **contribuição individual**, e não necessariamente score oficial obtido pelo time no Board.

### Coluna M

```text
Tiles
```

Conta quantas submissões o jogador possui.

### Colunas N:AV

São 35 slots de submissão numerados de 1 a 35.

Cada célula possui validação do tipo lista apontando para o named range `Tiles`.

Portanto, uma submissão é armazenada como uma string, por exemplo:

```text
Gauntlet - Crystal Armour Seed
Barrows - Verac's Piece (any)
Thieving - Blood Shard
Jar/Pet - Pet
```

---

## 7.3 Estado atual dos dados

No arquivo analisado existem:

```text
35 membros
46 submissões preenchidas
```

Exemplos de registros existentes:

```text
Arcane0214 -> Maggot King - Elder Venator Fang
em19em19 -> Medium Boots - Spiked Manacles
em19em19 -> Thieving - Enhanced Crystal Teleport Seed
Frangud -> Gauntlet - Crystal Armour Seed
JamesMokka -> Tormented Demons - Tormented Synapse
Papi Aksta -> Thieving - Blood Shard
Smokey Dro -> Tombs of Amascut - Lightbearer
```

---

# 8. Aba `Tile Breakdown`

## 8.1 Finalidade

`Tile Breakdown` reorganiza as submissões da aba `Individual Stats` por categoria.

Em vez de visualizar os dados por jogador, essa aba permite visualizar:

```text
Tile -> jogador - drop
```

Exemplo armazenado no resultado atual:

```text
Grotesque Guardians

OdinswrathUN - Granite Ring
OdinswrathUN - Granite Maul
OdinswrathUN - Granite Maul
```

Outro exemplo:

```text
Tormented Demons

JamesMokka - Tormented Synapse
Swordfish ll - Burning Claw
```

---

## 8.2 Layout

Os 36 tiles principais aparecem como uma matriz 6x6.

Linhas de nomes:

```text
3, 5, 7, 9, 11, 13
```

Linhas imediatamente abaixo exibem as contribuições correspondentes:

```text
4, 6, 8, 10, 12, 14
```

As colunas utilizadas são:

```text
C:H
```

Na linha 17 aparecem as seis categorias bônus:

```text
Nex
Nightmare
Megarares
Jar/Pet
Colosseum
Corporeal Beast
```

E a linha 18 contém os respectivos resultados de breakdown.

---

## 8.3 Fórmulas de agrupamento

A aba utiliza fórmulas avançadas para:

1. percorrer as linhas de `Individual Stats`;
2. obter o nome do jogador;
3. coletar os slots de submissão;
4. procurar submissões que contêm o nome do tile;
5. remover o prefixo `<Tile> - `;
6. juntar os resultados no formato `jogador - drop` separados por quebra de linha.

Entre as funções presentes estão:

```text
TEXTJOIN
BYROW
LAMBDA
LET
INDEX
CHOOSECOLS
SEQUENCE
MAP
SEARCH
REGEXREPLACE
```

---

# 9. Dependências entre as abas

## 9.1 `Individual Stats` -> `Accepted Drops`

`Accepted Drops` usa `COUNTIF` para contar ocorrências dos nomes dos drops em:

```text
Individual Stats!N3:AV37
```

Assim, adicionar uma submissão válida em `Individual Stats` aumenta automaticamente a contagem do drop correspondente.

---

## 9.2 `Accepted Drops` -> `Board`

`Board` consulta:

```text
progresso atual
requisito do tile
pontuação de bônus
```

para determinar:

- qual imagem exibir;
- se o tile está completo;
- se os pontos do tile devem entrar no placar;
- se uma linha está completa;
- se uma coluna está completa;
- quais valores bônus adicionar.

---

## 9.3 `Accepted Drops` -> `Individual Stats`

A tabela achatada `B84:R328` fornece:

- lista de opções válidas de submissão;
- contribuição individual de cada opção.

`Individual Stats!L` usa `VLOOKUP` nessa tabela para calcular os pontos individuais.

---

## 9.4 `Individual Stats` -> `Tile Breakdown`

`Tile Breakdown` lê as submissões e reorganiza o conteúdo por tile e jogador.

Ela não é a fonte primária dos dados; é uma visão derivada.

---

# 10. Estado atual do progresso do bingo

No arquivo analisado, nenhum dos 36 tiles principais atingiu seu requisito de conclusão.

Alguns progressos atuais relevantes são:

```text
Medium Boots          1 / 5
Thieving              2 / 3
Vorkath               1 / 8
Barrows               11 / 12
Grotesque Guardians   3 / 8
Tempoross             4 / 10
Tombs of Amascut      1 / 4
Tormented Demons      2 / 3
Gauntlet              4 / 6
Mortimer              5 / 15
Doom of Mokhaiotl     1 / 3
Skilling Tools        1 / 10
Dagannoth Kings       8 / 15
Royal Titans          3 / 10
Maggot King           1 / 2
Moons of Peril        3 / 8
```

Os demais tiles possuem progresso zero no snapshot analisado.

Categorias bônus no mesmo snapshot:

```text
Jar/Pet           2
MegaRares         0
Nightmare         0
Nex               0
Corporeal Beast   0
Fortis Colosseum  0
```

Isso explica o `Points Tally: 2` presente no `Board`.

---

# 11. Pontuação máxima implícita nas fórmulas

Com as fórmulas atualmente armazenadas:

```text
Tiles principais:                425
6 linhas x 30:                   180
6 colunas x 30:                  180
6 categorias bônus x máximo 20: 120
------------------------------------
Total máximo pelas fórmulas:     905
```

Entretanto, caso a regra textual de 40 por linha/coluna seja a pretendida, o total seria:

```text
425 + 6*40 + 6*40 + 120 = 1.025
```

O arquivo não resolve essa divergência sozinho.

---

# 12. Particularidades técnicas do XLSX exportado

## 12.1 Fórmulas provenientes de Google Sheets

Algumas fórmulas avançadas da aba `Tile Breakdown` foram armazenadas no `.xlsx` envolvidas em chamadas como:

```text
__xludf.DUMMYFUNCTION(...)
```

Isso ocorre com fórmulas que contêm funções como `BYROW`, `MAP` e `REGEXREPLACE` provenientes do ambiente original da planilha.

Como consequência, o arquivo XLSX contém **valores em cache** para várias dessas células, mas a capacidade de recalcular essas fórmulas pode variar quando aberto fora do ambiente em que a planilha foi criada.

Para desenvolvimento, é importante interpretar a intenção da fórmula, e não depender do `__xludf.DUMMYFUNCTION` como uma regra de negócio reutilizável.

---

## 12.2 Referências que merecem atenção

Foram observadas algumas referências potencialmente inconsistentes no arquivo exportado:

### `Individual Stats!M`

O cabeçalho oferece 35 slots de submissão (`N:AV`), porém a fórmula compartilhada da coluna `Tiles` é:

```excel
=COUNTA(N3:AL3)
```

Ou seja, ela conta somente `N:AL`, equivalente aos primeiros 25 slots, e não todos os 35 slots até `AV`.

### Total de Points na linha 38

A célula de totalização utiliza:

```excel
="Points: " & ROUND(SUM(L3:L26),1)
```

Apesar de existirem membros até a linha 37. Portanto, esse total não inclui todos os membros cadastrados.

### `Tile Breakdown`

As fórmulas exportadas de breakdown apresentam referência a:

```text
Individual Stats!A3:AV20
```

embora a tabela de membros vá até a linha 37 e os valores em cache exibam contribuições de jogadores localizados após a linha 20.

Essa diferença entre fórmula exportada e valor em cache é mais um motivo para tratar `Tile Breakdown` como visualização derivada, e não como fonte de verdade.

---

# 13. Nomenclaturas que variam entre abas

Algumas categorias aparecem com nomes ligeiramente diferentes dependendo da aba:

```text
GOTR                  <-> Guardians of the Rift
God Wars Dungeon      <-> Godwars Dungeon
MegaRares             <-> Megarares
Fortis Colosseum      <-> Colosseum
```

Essas diferenças são apenas de nomenclatura/visualização no arquivo; as submissões utilizam as strings definidas no named range `Tiles`.

---

# 14. O que é entrada manual e o que é calculado

## Entrada manual principal

Na planilha atual, os principais dados digitados manualmente são:

```text
Individual Stats!A3:A37     -> nomes dos membros
Individual Stats!B3:K37     -> pré-verificações
Individual Stats!N3:AV37    -> submissões
```

As listas e configurações de drops em `Accepted Drops` também são conteúdo configurável da planilha, mas não fazem parte do uso diário de registro de drops.

## Dados calculados

São derivados por fórmulas:

```text
Individual Stats!L          -> contribuição individual
Individual Stats!M          -> contagem de submissões
Accepted Drops              -> contagens e progresso
Board                       -> imagens e score
Tile Breakdown              -> agrupamento por tile
```

---

# 15. Semântica dos principais conceitos do arquivo

## Submission

Uma célula preenchida em `Individual Stats!N:AV` contendo uma string existente no named range `Tiles`.

Formato:

```text
<Categoria> - <Drop>
```

---

## Accepted Drop

Uma combinação categoria/drop registrada em `Accepted Drops` que possui um peso e, para tiles principais, contribui para o requisito daquele tile.

---

## Progress

Soma ponderada dos accepted drops registrados para determinado tile.

```text
Progress = Σ(contagem do drop * peso do drop)
```

---

## Completion Requirement

Valor mínimo de `Progress` necessário para concluir o tile.

---

## Tile Score

Pontuação fixa do tile no `Board`, concedida somente quando o requisito é alcançado:

```text
Low  = 5
Mid  = 10
High = 20
```

---

## Individual Contribution

Valor usado no ranking/estatística individual.

Para um drop de tile principal:

```text
Contribution = peso_do_drop / requisito_do_tile * valor_do_tile
```

Esse valor pode ser fracionário.

---

## Bonus Score

Pontos concedidos por drops pertencentes às seis categorias bônus. O total de cada categoria é limitado a 20.

---

## Pre-verification

Marca registrada por membro antes/durante o evento para comprovar condições específicas exigidas para aceitar determinados tipos de submissão.

---

# 16. Hierarquia de fontes de verdade dentro do arquivo

Ao interpretar este workbook, considerar a seguinte hierarquia:

### 1. Submissões realizadas

```text
Individual Stats!N3:AV37
```

São os registros concretos de drops/contribuições dos jogadores.

### 2. Regras quantitativas

```text
Accepted Drops
```

Define quais submissões são aceitas, seus pesos, requisitos e contribuição individual.

### 3. Regras textuais

```text
Board -> RULESET AND POINTS
```

Define regras adicionais que não estão integralmente expressas por fórmulas.

### 4. Visualizações calculadas

```text
Board
Tile Breakdown
```

São resultados derivados dos dados acima.

Quando uma visualização e os dados de origem divergirem, a divergência deve ser registrada em vez de assumir que a visualização é a fonte de verdade.

---

# 17. Resumo do arquivo para contexto de IA

O workbook é uma implementação em planilha de um bingo de OSRS baseado em submissões de drops.

O dado operacional primário é armazenado na aba `Individual Stats`, onde cada membro possui até 35 slots de submissão. Cada submissão é uma string do tipo `Categoria - Drop`, escolhida a partir do named range `Tiles`, que referencia 245 opções cadastradas em `Accepted Drops`.

`Accepted Drops` conta automaticamente essas strings, associa cada drop a um peso, soma os pesos para calcular o progresso de cada um dos 36 tiles e compara o resultado com um requisito de conclusão. Os tiles possuem tiers Low/Mid/High correspondentes a 5/10/20 pontos no placar. O mesmo sheet mantém seis categorias bônus, cada uma limitada a 20 pontos, e uma tabela auxiliar que calcula a contribuição individual de cada tipo de submissão.

`Board` é a visualização principal. Seus 36 tiles formam uma grade 6x6 e utilizam imagens externas dinâmicas para representar o progresso e o estado de conclusão. O placar só recebe os pontos de um tile depois que o requisito é totalmente atingido. O Board também calcula bônus por linhas e colunas completas e incorpora os seis bônus especiais.

`Tile Breakdown` é uma visualização derivada que reorganiza as submissões de `Individual Stats` por tile e mostra registros no formato `jogador - drop`.

O arquivo contém algumas inconsistências e artefatos de exportação que devem ser preservados como observações: o texto de regras diz 40 pontos por linha/coluna, mas as fórmulas concedem 30; a coluna de contagem de submissões usa apenas os primeiros 25 dos 35 slots; o total de pontos individuais da linha final não cobre todos os jogadores; e algumas fórmulas avançadas exportadas do Google Sheets aparecem como `__xludf.DUMMYFUNCTION`.

Este documento descreve o comportamento observado no Excel. Ele não determina como esses conceitos devem ser implementados em software.
