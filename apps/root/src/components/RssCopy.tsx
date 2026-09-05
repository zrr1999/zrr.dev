import { toast } from "sonner";

const RSS_URL = "https://blog.zrr.dev/rss.xml";

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    textarea.remove();
    return ok;
  } catch {
    return false;
  }
}

export default function RssCopy() {
  async function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    // 保留修饰键点击（新标签打开等）与右键菜单的原生行为
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
    const ok = await copyText(RSS_URL);
    if (ok) {
      toast.success("已复制 RSS 链接");
    } else {
      toast.error("复制失败，请右键复制链接");
    }
  }

  return (
    <a
      className="transition-colors hover:text-(--fg)"
      href={RSS_URL}
      title="复制 RSS 链接"
      onClick={handleClick}
    >
      RSS
    </a>
  );
}
