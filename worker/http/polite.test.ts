import { describe, expect, it } from "vitest";
import { __test } from "./polite";

describe("coleta educada", () => {
  it("pausa vale para o domínio inteiro, não só para o host", () => {
    expect(__test.siteOf("www.kabum.com.br")).toBe("kabum.com.br");
    expect(__test.siteOf("s.shopee.com.br")).toBe("shopee.com.br");
    expect(__test.siteOf("api.mercadolibre.com")).toBe("mercadolibre.com");
    expect(__test.siteOf("amzn.to")).toBe("amzn.to");
    expect(__test.siteOf("www.amazon.com.br.")).toBe("amazon.com.br");
  });
});
