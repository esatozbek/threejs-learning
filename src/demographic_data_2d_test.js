import demographicData from "../public/demographic_data.asc";
import parseData from "./utils/parseDemographicData";

console.log(parseData(demographicData));

function drawData(file) {
  const { min, max, data, ncols, nrows } = file;
  const range = max - min;
  const ctx = document.getElementById("canvas").getContext("2d");
  // make the canvas the same size as the data
  ctx.canvas.width = ncols;
  ctx.canvas.height = nrows;
  // but display it double size so it's not too small
  ctx.canvas.style.width = px(ncols * 4);
  ctx.canvas.style.height = px(nrows * 4);
  // fill the canvas to dark gray
  ctx.fillStyle = "#444";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  // draw each data point
  data.forEach((row, latNdx) => {
    row.forEach((value, lonNdx) => {
      if (value === undefined) {
        return;
      }
      const amount = (value - min) / range;
      const hue = 1;
      const saturation = 1;
      const lightness = amount;
      ctx.fillStyle = hsl(hue, saturation, lightness);
      ctx.fillRect(lonNdx, latNdx, 1, 1);
    });
  });
}

function px(v) {
  return `${v | 0}px`;
}

function hsl(h, s, l) {
  return `hsl(${(h * 360) | 0},${(s * 100) | 0}%,${(l * 100) | 0}%)`;
}

drawData(parseData(demographicData));
