# Ruínas Esquecidas

Roguelite 2D de ação lateral em fantasia sombria. Você controla o Último Vigia, que desce os andares de uma fortaleza em ruínas, enfrentando o que restou de seus habitantes.

Dead Cells, Skul, Astral Ascent, Have a Nice Death, Blasphemous e Hollow Knight servem apenas como referência de design. Nenhum código, arte ou conteúdo foi copiado.

## Status

- [x] 1. Setup e movimento
- [x] 2. Combate básico
- [x] 3. Inimigos (Carniçal, Arqueiro Oco, Vulto e Cão de Ossos; o chefe vem na etapa 5)
- [x] 4. Relíquias
- [x] 5. Salas procedurais (fortaleza em 3 biomas, minimapa e o chefe Guardião Partido)
- [ ] 6. Progressão permanente
- [ ] 7. Polimento e deploy

## Prints e GIFs

<!-- Adicionar prints e GIFs em docs/ e referenciar aqui, por exemplo: ![Movimento](docs/movimento.gif) -->

## Como rodar

Requer Node 22.13 ou superior.

```bash
npm install        # instala as dependências
npm run dev        # servidor de desenvolvimento
npm test           # testes (Vitest)
npm run lint       # ESLint
npm run typecheck  # checagem de tipos
npm run build      # build de produção
```

## Controles

| Ação            | Teclado        | Controle                         |
| --------------- | -------------- | -------------------------------- |
| Andar           | Setas ou A/D   | Analógico esquerdo ou direcional |
| Pular           | Espaço ou W    | Botão A (índice 0)               |
| Rolar           | L ou Shift     | Botão B (índice 1) ou RB         |
| Atacar          | J              | Botão X (índice 2)               |
| Especial        | K              | Botão Y (índice 3)               |
| Trocar relíquia | Q              | LB (índice 4)                    |
| Pausa           | Esc (em breve) | em breve                         |

## Combate (etapa 2)

- **Ataque** em três fases (preparação, golpe ativo, recuperação), com hitbox e knockback. Rolar cancela a recuperação.
- **Esquiva perfeita:** rolar até 150 ms antes de um golpe acertar dá câmera lenta, um anel de luz e dobra o dano do seu próximo ataque. A janela fica em `src/data/combat.ts`.
- **Sensação de impacto:** hit stop, tremor de câmera, faíscas, números de dano e arco do golpe. Todos os valores ficam em `src/data/fx.ts`.
- Ao morrer, a tela "Você caiu" reinicia a run (J, Espaço ou botão A/X do controle).

## Atmosfera e direção de arte (pixel art em código)

Cada bioma tem o seu clima, definido em `src/data/biomeLook.ts` (rampas de cor da pedra, céu, musgo, luz e névoa):

- **Muralhas e Pátio:** noite de luar, céu em degradê com _dithering_, lua com crateras, fortaleza em ruínas ao longe, arcadas góticas com janelas e trepadeiras.
- **Salões e Capela:** salão de pedra roxa com vitrais acesos, feixes de luz, colunas, estandartes e cortinas de veludo.
- **Catacumbas e Masmorra:** pedra úmida esverdeada, nichos de caveiras, raízes, correntes e lanternas de alma.

Cada fundo tem três planos com parallax (distante, médio e primeiro plano). Os blocos de pedra mudam conforme os lados que ficam ao ar livre (quinas iluminadas, bases sombreadas) e a decoração do cenário (tufos, ossos, pedregulho, trepadeiras, correntes, estalactites, teias e rachaduras) é sorteada por sala com a semente da run (`src/logic/decor.ts`). A escuridão é da cor de cada bioma e é "apagada" por luzes de verdade: tochas, fogueiras, a porta e o baú também iluminam. Os personagens têm sombra no chão e a barra de vida tem moldura, rastro de dano e pulso com pouca vida.

Os desenhos ficam em `src/systems/biomeBackgrounds.ts`, `tileArt.ts`, `decorArt.ts` e `environmentTextures.ts`; para usar arte final basta carregar imagens com as mesmas chaves.

**Nitidez:** o jogo usa escala inteira _em pixels do monitor_, não do CSS. Com a escala do Windows em 125% ou 150%, um zoom inteiro em pixels CSS vira fracionário no monitor e alguns pixels ficam maiores que outros (borrão e tremida); aqui o zoom é calculado em pixels reais (`src/utils/zoom.ts`).

## Interface (HUD)

Toda a interface usa o mesmo estilo de painéis de pedra e ferro (`src/systems/hudArt.ts`) e a fonte de pixels (`src/systems/pixelFont.ts`). Os valores ficam em `src/data/ui.ts`.

- **Vida:** painel no canto superior esquerdo com o coração, a barra com marcas e brilho, os números e um rastro claro que mostra o tamanho do dano; com pouca vida a barra pulsa.
- **Relíquias:** duas casas no canto inferior esquerdo. A ativa tem moldura na cor da relíquia, brilho e a tecla do especial (K); a outra fica apagada com a tecla de troca (Q). A recarga sobe como uma cortina e a casa pisca quando o especial volta.
- **Minimapa:** painel no canto superior direito com as salas em relevo, a sala atual pulsando e três losangos que mostram em qual bioma você está.
- **Chefe:** painel no pé da tela com o nome, a barra com um traço onde começa a fase 2 e o rastro do último golpe.
- **Dica de controles:** teclas desenhadas como teclas, na primeira sala, sumindo sozinhas.
- **Nome do bioma ("ATO I"), números de dano e telas** de morte, vitória e escolha de relíquia também usam a fonte de pixels.

## O Último Vigia (pixel art em código)

O herói é desenhado quadro a quadro em código: elmo com a viseira acesa, armadura cinza-azulada, capa e penacho rasgados, com contorno automático de 1 px. Um esqueleto simples (ombros, mãos, joelhos, pés) calculado em `src/logic/heroPose.ts` posiciona as partes em cada pose de `src/data/hero.ts`, e `src/logic/heroAnim.ts` escolhe a animação pelo estado (parado, correndo, pulando, caindo, rolando, preparando/golpeando/recuperando, ferido, morto). A arma da relíquia aparece na mão e gira com o golpe; o Tomo flutua ao lado. Poeira sobe ao pousar e ao rolar.

## Relíquias (etapa 4)

Existem **9 relíquias**; o jogador carrega **duas** e alterna entre elas com **Q**. Cada uma define o ataque básico, um **especial com recarga** (K) e um **bônus passivo** (vale enquanto ela está ativa). Os dados ficam em `src/data/relics.ts`.

| Relíquia          | Básico                   | Especial                            | Passiva                       |
| ----------------- | ------------------------ | ----------------------------------- | ----------------------------- |
| Lâmina do Vigia   | Combo de 3 golpes        | Investida que atravessa inimigos    | +12% de velocidade            |
| Martelo Sepulcral | Lento, muito knockback   | Impacto no chão que atordoa em área | -20% de dano recebido         |
| Foice da Névoa    | Alcance longo e rápido   | Rouba vida dos inimigos atingidos   | +15% de dano                  |
| Tomo Cinzento     | Raio à distância         | Barreira que bloqueia flechas       | -20% de recarga dos especiais |
| Adaga Sombria     | Combo rápido de 4 golpes | Investida curta e veloz             | +18% de velocidade            |
| Lança Vigilante   | Estocada de longe        | Arremetida que perfura              | -10% de dano recebido         |
| Machado Rachador  | Dois golpes pesados      | Giro que acerta em volta            | +25% de dano                  |
| Arco de Osso      | Flecha rápida de longe   | Flecha pesada que atordoa           | +10% de dano                  |
| Mangual Cinéreo   | Golpe e giro em volta    | Rodopio que empurra                 | -25% de recarga dos especiais |

- **Golpe de troca:** trocar de relíquia até 0,7 s depois de acertar um inimigo dispara um golpe curto em área (cada acerto vale um golpe de troca).
- **Novas relíquias** caem de inimigos derrotados; ao pegar uma, você escolhe qual das duas descartar (ou deixa no chão). A relíquia largada por um inimigo **some depois de 14 s** (pisca nos últimos 4 s); as de baús e do chefe esperam para sempre. Os baús das salas de tesouro sempre soltam uma relíquia (ou curam, se não houver nenhuma nova).

## Inimigos (etapa 3)

Cada inimigo tem uma IA por **máquina de estados** pura (`src/logic/ai`), que só recebe o que ele "percebe" e devolve o que quer fazer. A entidade Phaser traduz isso em movimento. Piscar em laranja = golpe chegando: dá tempo de rolar.

| Inimigo      | Comportamento                                           |
| ------------ | ------------------------------------------------------- |
| Carniçal     | Patrulha, avança quando vê o jogador e golpeia de perto |
| Arqueiro Oco | Mantém distância, mira (telegrafia) e atira flechas     |
| Vulto        | Flutua, atravessa plataformas e ataca em mergulho       |
| Cão de Ossos | Rápido, dá botes; em bando, os ataques são escalonados  |

Os inimigos e o chefe são **pixel art desenhada em código**, quadro a quadro, como o herói: cada um tem a sua silhueta (o Carniçal encurvado de trapos vermelhos, o Arqueiro Oco encapuzado com arco de osso, o Vulto de fiapos roxos, o Cão de Ossos de costelas à mostra, o Guardião de armadura rachada) e animações de parado, andando, preparando o golpe, golpeando, recuperando, ferido e morrendo. As poses ficam em `src/data/enemySprites.ts`, o desenho em `src/systems/enemySprites.ts` e a escolha da animação em `src/logic/enemyAnim.ts`. Ao morrer, o corpo cai, fica um instante no chão e some.

Flechas também podem ser esquivadas com a esquiva perfeita. Inimigos derrotados não renascem na mesma sala; os valores de cada um ficam em `src/data/enemies.ts`.

## A fortaleza (etapa 5)

Uma run atravessa **3 biomas**, cada um um mapa interligado de salas gerado por semente: **Muralhas e Pátio**, **Salões e Capela** e **Catacumbas e Masmorra**. Cada mapa tem sala inicial, salas de combate, uma fogueira de descanso, um baú, uma sala secreta e uma **porta de saída** para o bioma seguinte; o último termina na arena do chefe.

- **Salas:** desenhos em texto (`src/data/templates`), em células de 30x17 blocos, com portas nas quatro direções. Antes de entrar no jogo, todo desenho é validado: as portas se alcançam com os pulos do herói e nada fica fora de alcance (`src/logic/map`).
- **Geração:** `generateBiomeMap` monta o grafo de salas numa grade, com ligações extras para criar voltas, e sorteia os desenhos pela semente. A mesma semente dá a mesma run.
- **Viagem:** as portas abertas levam à sala vizinha; as sem ligação são fechadas por parede. O minimapa (canto da tela) mostra as salas visitadas e as vizinhas; a sala secreta só aparece depois de visitada.
- **Fogueira:** cura tudo uma vez. **Baú:** solta uma relíquia. **Porta de saída:** abre o próximo bioma.
- **Guardião Partido:** o chefe tem três ataques (pancada, investida e tremor) e entra numa fase 2 mais agressiva com metade da vida. Ao cair, solta uma relíquia e a tela de vitória aparece. Dados em `src/data/boss.ts`, IA em `src/logic/ai/boss.ts`.
- Cada bioma tem a sua escuridão e névoa (`BIOME_DARKNESS`).

## Decisões técnicas

- **Phaser 3 + Arcade Physics** para renderização e colisões.
- **TypeScript em modo `strict`.**
- **Lógica pura separada da camada Phaser:** `src/logic` não importa Phaser e é coberta por testes com Vitest; a camada Phaser apenas chama essas funções.
- **Dados em `src/data`:** balanceamento e conteúdo (relíquias, inimigos, salas) fora do código de lógica.
- **Resolução 480x270 com escala inteira**, para manter o pixel art nítido.
- **Coyote time e jump buffer** para um pulo mais tolerante e responsivo.
- **Sem alocação no `update`:** objetos pré-alocados e reutilizados para evitar pausas do coletor de lixo.
- **Placeholders criados em código:** nenhum arquivo de arte externo por enquanto.
- **Fonte pixel (Press Start 2P, OFL) em bitmap:** os glifos são desenhados uma vez num atlas, sem meios-tons e com contorno escuro de 1 px já no desenho, e viram uma fonte de bitmap do Phaser. O texto fica nítido em qualquer escala inteira (o texto comum de canvas borrava nas bordas e no contorno).

## Estrutura de pastas

```text
src/
  logic/     lógica pura, sem Phaser
  data/      balanceamento e conteúdo
  scenes/    cenas do Phaser
  entities/  jogador, inimigos e afins
  systems/   sistemas que ligam a lógica ao Phaser
tests/       testes da lógica
docs/        prints e GIFs
```

## Licenças

- Código: licença MIT.
- Assets (gráficos e sons): veja [ASSETS-LICENSES.md](ASSETS-LICENSES.md).

```text
MIT License

Copyright (c) <ano 2026> <seu nome>
```
