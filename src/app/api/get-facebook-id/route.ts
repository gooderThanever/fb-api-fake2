import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const delay = (m: number) => new Promise((r) => setTimeout(r, m));
const providers = [
  {
    name: "duykhoa",
    method: "POST" as const,
    url: "https://duykhoa.com/assets/ajax/get_uid.php",
    buildBody: (link: string) => {
      const fd = new FormData();
      fd.append("link", link);
      return fd;
    },
    parseId: (data: any) => data.uid,
    success: (data: any) => data.code === 200 && /^\d+$/.test(data.uid),
    isEmpty: (data: any) =>
      data.msg === "Nhập sai đường dẫn link url hoặc chọn sai loại.",
  },
  {
    name: "ffb", //Cái ffb này xịn nhất
    method: "GET" as const,
    url: (link: string) => `https://ffb.vn/api/tool/get-id-fb?idfb=${link}`,
    parseId: (data: any) => data.id,
    success: (data: any) => /^\d+$/.test(data.id),
    isEmpty: (data: any) =>
      data.msg === "Nhập sai đường dẫn link url hoặc chọn sai loại.",
  },
  {
    name: "traodoisub",
    method: "POST" as const,
    url: "https://id.traodoisub.com/api.php",
    buildBody: (link: string) => {
      const fd = new FormData();
      fd.append("link", link);
      return fd;
    },
    parseId: (data: any) => data.id,
    success: (data: any) => data.code === 200 && /^\d+$/.test(data.id),
    isEmpty: (data: any) =>
      data.msg === "Nhập sai đường dẫn link url hoặc chọn sai loại.",
  },
  {
    name: "phanmemninja",
    method: "POST" as const,
    url: "https://www.phanmemninja.com/wp-content/uid.php",
    buildBody: (link: string) => {
      const fd = new FormData();
      fd.append("link", link);
      return fd;
    },
    parseId: (data: any) => data.data,
    success: (data: any) => data.code === 200 && /^\d+$/.test(data.data),
    isEmpty: (data: any) =>
      data.msg === "Nhập sai đường dẫn link url hoặc chọn sai loại.",
  },
  {
    name: "proxyv6",
    method: "POST" as const,
    url: "https://proxyv6.net/wp-admin/admin-ajax.php",
    buildBody: (link: string) => {
      const fd = new FormData();
      fd.append("link", link);
      fd.append("action", "nlw_getuid_fb");
      return fd;
    },
    parseId: (data: any) => data.id,
    success: (data: any) => /^\d+$/.test(data.id),
    isEmpty: (data: any) =>
      data.msg === "Nhập sai đường dẫn link url hoặc chọn sai loại.",
  }
];

export async function POST(req: NextRequest) {
  const { linkFacebook } = (await req.json()) as {
    linkFacebook: {
      value: string;
      row: number;
    }[];
  };

  const results: { id: string; row: number }[] = await Promise.all(
    linkFacebook.map(async (link, index) => {
      const sequence = [
        ...providers.slice(index - 1),
        ...providers.slice(0, index - 1),
      ];
      for (let i = 0; i < sequence.length; i++) {
        const { url, method, buildBody, parseId, success, isEmpty } =
          sequence[i];
        const endpoint = typeof url === "function" ? url(link.value) : url;
        const init: RequestInit = {
          method,
          body: method === "POST" ? buildBody(link.value) : undefined,
        };

        try {
          const startTime = Date.now();
          const res = await fetch(endpoint, init);
          if (!res.ok) continue;
          const data = await res.json();
          const id = parseId(data);
          if (success(data)) {
            const elapsed = Date.now() - startTime;
            if (elapsed < 1000) await delay(1000 - elapsed);
            if (i !== 0 && elapsed < 2000) await delay(2000 - elapsed);
            return { id, row: link.row };
          } else if (isEmpty(data)) return { id: "", row: link.row };
        } catch {}
      }
      return { id: "", row: link.row };
    })
  );

  return NextResponse.json({ status: true, data: results }, { status: 200 });
}
