import { useEffect } from "react";

declare global {
  interface Window {
    lastKeyPressed?: string;
    lastKeyTimeout?: number;
  }
}

export function useVim() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Bỏ qua nếu đang gõ vào ô nhập liệu
      const activeEl = document.activeElement;
      const isTyping =
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          (activeEl as HTMLElement).isContentEditable);
      if (isTyping) return;

      // 2. Cấu hình các thông số cuộn
      const scrollAmount = 100;
      const halfPage = window.innerHeight / 2;

      switch (e.key) {
        // Cuộn từng dòng
        case "j":
          window.scrollBy({ top: scrollAmount, behavior: "smooth" });
          break;
        case "k":
          window.scrollBy({ top: -scrollAmount, behavior: "smooth" });
          break;

        // Cuộn nửa trang (như Ctrl+u / Ctrl+d nhưng map sang phím thường cho tiện)
        case "d":
          window.scrollBy({ top: halfPage, behavior: "smooth" });
          break;
        case "u":
          window.scrollBy({ top: -halfPage, behavior: "smooth" });
          break;

        // Về đầu trang (gg)
        case "g":
          if (window.lastKeyPressed === "g") {
            window.scrollTo({ top: 0, behavior: "smooth" });
            window.lastKeyPressed = ""; // Reset sau khi thực hiện
          } else {
            window.lastKeyPressed = "g";
            // Xóa trạng thái chờ 'g' sau 500ms nếu không nhấn tiếp g thứ hai
            window.clearTimeout(window.lastKeyTimeout);
            window.lastKeyTimeout = window.setTimeout(() => {
              window.lastKeyPressed = "";
            }, 500);
            return; // Thoát để không ghi đè lastKeyPressed ở cuối
          }
          break;

        // Xuống cuối trang (G)
        case "G":
          window.scrollTo({
            top: document.body.scrollHeight,
            behavior: "smooth",
          });
          break;

        // Quay lại trang trước (như phím Back trong trình duyệt)
        case "H": // Shift + h
          window.history.back();
          break;

        // Tiến tới trang sau (như phím Forward)
        case "L": // Shift + l
          window.history.forward();
          break;

        default:
          break;
      }

      // Lưu phím vừa nhấn để xử lý các tổ hợp như 'gg'
      window.lastKeyPressed = e.key;
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.clearTimeout(window.lastKeyTimeout);
    };
  }, []);
}
