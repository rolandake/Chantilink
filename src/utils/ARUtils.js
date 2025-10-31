// src/utils/ARUtils.js

export const drawARElements = (ctx, landmarks, canvasWidth, canvasHeight, time = 0) => {
  if (!landmarks || landmarks.length === 0) return;

  const noseTip = landmarks[1];
  const leftCheek = landmarks[234];
  const rightCheek = landmarks[454];
  const chin = landmarks[152];
  const leftEye = landmarks[33];
  const rightEye = landmarks[263];

  const faceWidth = (rightCheek.x - leftCheek.x) * canvasWidth;
  const faceHeight = (chin.y - noseTip.y) * canvasHeight;
  const centerX = leftCheek.x * canvasWidth + faceWidth / 2;
  const centerY = noseTip.y * canvasHeight;

  const dx = rightEye.x - leftEye.x;
  const dy = rightEye.y - leftEye.y;
  const angle = Math.atan2(dy * canvasHeight, dx * canvasWidth);

  const earOscillation = Math.sin(time * 2) * faceWidth * 0.02;
  const crownOscillation = Math.sin(time * 1.5) * faceWidth * 0.02;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(angle);

  ctx.fillStyle = "rgba(255, 0, 0, 0.7)";
  ctx.shadowColor = "rgba(255, 0, 0, 0.5)";
  ctx.shadowBlur = 10;
  const earWidth = faceWidth * 0.13;
  const earHeight = faceHeight * 0.25;
  const earOffsetX = faceWidth * 0.2;
  const earOffsetY = faceHeight * 0.1;

  ctx.beginPath();
  ctx.ellipse(-earOffsetX + earOscillation, -earOffsetY, earWidth, earHeight, 0, 0, Math.PI * 2);
  ctx.ellipse(earOffsetX + earOscillation, -earOffsetY, earWidth, earHeight, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowColor = "transparent";
  ctx.fillStyle = "black";
  const noseRadius = faceWidth * 0.05;
  ctx.beginPath();
  ctx.arc(0, faceHeight * 0.25, noseRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "black";
  ctx.lineWidth = 2;
  ctx.beginPath();
  const whiskerLength = faceWidth * 0.1;
  const whiskerOffsetY = faceHeight * 0.025;

  ctx.moveTo(-whiskerLength / 2, faceHeight * 0.25);
  ctx.lineTo(-whiskerLength, faceHeight * 0.25 - whiskerOffsetY);
  ctx.moveTo(-whiskerLength / 2, faceHeight * 0.25 + whiskerOffsetY);
  ctx.lineTo(-whiskerLength, faceHeight * 0.25 + whiskerOffsetY);

  ctx.moveTo(whiskerLength / 2, faceHeight * 0.25);
  ctx.lineTo(whiskerLength, faceHeight * 0.25 - whiskerOffsetY);
  ctx.moveTo(whiskerLength / 2, faceHeight * 0.25 + whiskerOffsetY);
  ctx.lineTo(whiskerLength, faceHeight * 0.25 + whiskerOffsetY);
  ctx.stroke();

  const crownSize = faceWidth * 0.25;
  ctx.font = `${crownSize}px sans-serif`;
  ctx.fillStyle = "gold";
  ctx.strokeStyle = "orange";
  ctx.lineWidth = 2;

  ctx.strokeText("👑", -crownSize / 2 + crownOscillation, -faceHeight * 0.5);
  ctx.fillText("👑", -crownSize / 2 + crownOscillation, -faceHeight * 0.5);

  ctx.restore();
};
