/* Canvas 렌더링 공통 도우미 */
window.KOMSCO = window.KOMSCO || {};
window.KOMSCO.Renderer = {
  coverRect(image, viewportWidth, viewportHeight) {
    const imageRatio = image.width / image.height;
    const viewportRatio = viewportWidth / viewportHeight;
    if (imageRatio > viewportRatio) {
      const height = viewportHeight;
      const width = height * imageRatio;
      return { x: (viewportWidth - width) / 2, y: 0, width, height };
    }
    const width = viewportWidth;
    const height = width / imageRatio;
    return { x: 0, y: (viewportHeight - height) / 2, width, height };
  },
  worldToScreen(x, y, backgroundRect) {
    return {
      x: backgroundRect.x + (x / 100) * backgroundRect.width,
      y: backgroundRect.y + (y / 100) * backgroundRect.height
    };
  }
};
