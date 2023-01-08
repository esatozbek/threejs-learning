const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
  entry: "./src/index.js",
  output: {
    filename: "main.js",
    path: path.resolve(__dirname, "dist"),
  },
  module: {
    rules: [
      {
        test: /\.asc$/i,
        use: "raw-loader",
      },
    ],
  },
  plugins: [
    new CopyPlugin({
      patterns: [{ from: "public/assets", to: "assets" }],
    }),
  ],
};
