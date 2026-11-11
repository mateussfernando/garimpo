import { describe, expect, it } from "vitest";
import { ALVOS_V0 } from "@/config/alvos";
import { matchAlvo, stripPrefixes } from "./alvos";
import { bandOf, extractSpecs } from "./specs";

const alvos = ALVOS_V0.map((a, i) => ({ id: i + 1, ...a }));
const slug = (t: string) => matchAlvo(t, alvos)?.slug ?? null;

// Todos os títulos abaixo são reais, vistos pelo app em 10/11/2026.
describe("Alvo: o termo precisa ser o produto em si", () => {
  it("não confunde detalhe com produto (os falsos que estavam na Vitrine)", () => {
    expect(slug("Placa-Mãe ASRock B650M-HDV/M.2, AMD B650, DDR5")).toBeNull();
    expect(slug("Notebook ASUS Vivobook 16 Intel Core i7, 8 GB, 512 GB SSD, KeepOS/Linux, 16")).toBeNull();
    expect(slug("[Grupo de 3] Mouse Bluetooth 2.4G Recarregável Ergonômico")).toBeNull();
  });

  it("acha o Alvo certo mesmo com prefixo de loja ou de pressa", () => {
    expect(slug("CORRE - Mouse sem fio Logitech MX Master 4 - R$ 471,29 (12x sem juros)")).toBe("mouse");
    expect(slug("Amazon - Monitor Gamer TCL 25 Polegadas QD-Mini LED Full HD G64 300Hz 1ms - R$949,05")).toBe("monitor");
    expect(slug("[Amazon BF] Teclado sem fio Logitech MX Keys S por R$ 529,90")).toBe("teclado");
    expect(slug("Por R$ 26,69: Mouse Gamer XT Racer Rush RGB 7200DPI 1ms")).toBe("mouse");
    expect(slug("🔥 Headset Gamer XPG Precog 7.1 Driver Duplo")).toBe("headset");
  });

  it("separa os antigos Acessórios em Alvos próprios", () => {
    expect(slug("Mousepad Gamer Rise Mode Speed, Estendido (900x300mm) Costura Verde - RG-MP-06-ZG")).toBe("mousepad");
    expect(slug("Mouse Pad Gamer Grande")).toBe("mousepad");
    expect(slug("Webcam Full HD Logitech C920s com Microfone Embutido")).toBe("webcam");
    expect(slug("Webcam + Suporte Logitech Brio 500 Full HD")).toBe("webcam");
    expect(slug("Hub USB-C 7 em 1 com HDMI 4K")).toBe("hub");
    expect(slug("Microfone Condensador USB HyperX SoloCast")).toBe("microfone");
  });

  it("outro tipo de produto antes do termo não é Alvo", () => {
    expect(slug("Cabo HDMI 2.1 para Monitor 2m")).toBeNull();
    expect(slug("Suporte para Headset de Mesa")).toBeNull();
    expect(slug("Capa para Teclado Mecânico 60%")).toBeNull();
    expect(slug("Kit Gamer Teclado + Mouse Redragon")).toBeNull();
    expect(slug("Teclado e Mouse sem fio Logitech MK235")).toBeNull();
    expect(slug("Fone de Ouvido Bluetooth JBL Tune 520")).toBeNull();
    expect(slug("Case para SSD M.2 NVMe USB-C")).toBeNull();
  });

  it("acessório DE um produto não é o produto (falsos vistos no Telegram)", () => {
    expect(slug("Escova de limpeza de teclado 8 em 1 multifuncional portátil para computador")).toBeNull();
    expect(slug("🔥 MONITOR DE ÁUDIO MOONDROP MM3A (LDAC) (BT 6.0) (66 Watts) 📉")).toBeNull();
    expect(slug("Base para Monitor com Gavetas")).toBeNull();
    expect(slug("Luminária de Tela para Monitor BenQ")).toBeNull();
  });

  it("chamada de oferta antes do produto não atrapalha", () => {
    expect(slug("Promoção de Mouse Logitech G203")).toBe("mouse");
    expect(slug("Oferta relâmpago: Monitor LG 27 QHD")).toBe("monitor");
    expect(slug("Headset Gamer com Microfone HyperX Cloud Stinger")).toBe("headset");
  });

  it("mantém os casos de sempre", () => {
    expect(slug("Braço Articulado para Monitor 17 a 32")).toBe("braco-articulado");
    expect(slug("Suporte Articulado para Monitor com Pistão a Gás")).toBe("braco-articulado");
    expect(slug("Monitor de pressão arterial digital")).toBeNull();
    expect(slug("SSD Kingston NV3 1TB NVMe")).toBe("ssd");
    expect(slug("Teclado Logitech Bluetooth USB K380s Easy-Switch")).toBe("teclado");
    expect(slug("Air fryer 4L")).toBeNull();
  });

  it("tira prefixos sem comer o nome do produto", () => {
    expect(stripPrefixes("[ML] Montando um Kit 72h - Mini Rádio")).toBe("Montando um Kit 72h - Mini Rádio");
    expect(stripPrefixes("Amazon - Teclado sem fio")).toBe("Teclado sem fio");
    expect(stripPrefixes("Monitor Gamer AOC")).toBe("Monitor Gamer AOC");
  });
});

describe("Especificações e faixas", () => {
  const band = (alvo: string, title: string) => bandOf(alvo, extractSpecs(title))?.label ?? null;

  it("monitor: compara por tamanho e resolução", () => {
    expect(extractSpecs('Monitor Gamer AOC 22", Full HD, 120Hz, 1ms')).toMatchObject({ inches: 22, res: "fhd", hz: 120 });
    expect(band("monitor", 'Monitor Gamer Acer EK241Y Gbi, 23.8" Full HD, IPS, 120Hz')).toBe('24" Full HD');
    expect(band("monitor", "Monitor Gamer Rise Mode Elite 27 QHD 165Hz 1ms")).toBe('27" QHD');
    expect(band("monitor", 'Monitor Gamer ASUS TUF Gaming Series 5, 27", Full HD, Fast IPS, 260Hz')).toBe('27" Full HD');
    expect(band("monitor", "Monitor Gamer TCL 25 Polegadas QD-Mini LED Full HD G64 300Hz")).toBe('24" Full HD');
    expect(band("monitor", 'Monitor LG UltraWide 34" WQHD 100Hz')).toBe("Ultrawide QHD");
  });

  it("monitor sem tamanho ou resolução no título fica sem faixa, em vez de ser comparado errado", () => {
    expect(band("monitor", "Monitor Gamer Acer Preto UM.QE1AA.G01")).toBeNull();
  });

  it("SSD por capacidade e tipo", () => {
    expect(band("ssd", "SSD Kingston NV3 1TB NVMe M.2")).toBe("1 TB NVMe");
    expect(band("ssd", "SSD Crucial BX500 480GB SATA")).toBe("480 a 512 GB SATA");
    expect(band("ssd", "SSD WD Blue 2TB M.2")).toBe("2 TB NVMe");
  });

  it("mouse, teclado e headset por conexão", () => {
    expect(band("mouse", "Mouse sem fio Logitech MX Master 4")).toBe("Sem fio");
    expect(band("mouse", "Mouse Gamer XT Racer Rush RGB 7200DPI")).toBe("Com fio");
    expect(band("teclado", "Teclado Mecânico Gamer Shark X87 TKL RGB")).toBe("Mecânico com fio");
    expect(band("teclado", "Teclado sem fio Logitech Pebble Keys 2 K380s")).toBe("Sem fio");
  });

  it("mousepad pelo tamanho, das medidas ou da palavra", () => {
    expect(band("mousepad", "Mousepad Gamer Rise Mode Speed, Estendido (900x300mm)")).toBe("Estendido");
    expect(band("mousepad", "Mousepad Maxprint, Pequeno, 220x178mm, Preto")).toBe("Pequeno");
    expect(band("mousepad", "Mousepad Maxprint, 23x19.5cm, com Apoio em Gel")).toBe("Pequeno");
    expect(band("mousepad", "Mousepad Gamer Colorido")).toBeNull();
  });
});
