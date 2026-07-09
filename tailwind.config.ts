import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 落ち着いたスレートインディゴ1色をアクセントカラーとして使う。
        // 「押せる場所」だけに使うことで、彩度の高い青一色よりも
        // 情報が多い一覧画面でも視線が散らばらない。
        brand: {
          50: "#EEF0F6",
          100: "#E4E7F1",
          500: "#4A5578",
          600: "#3D4A6B",
          700: "#2E3854",
        },
        // 削除など破壊的な操作の色。彩度を抑えた控えめな警告色。
        danger: {
          soft: "#F7EBEA",
          border: "#E7CDC9",
          DEFAULT: "#B5504A",
          hover: "#9A4038",
        },
      },
    },
  },
  plugins: [],
};

export default config;
