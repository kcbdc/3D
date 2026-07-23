/* 인벤토리 수량 관리 */
window.KOMSCO = window.KOMSCO || {};
window.KOMSCO.Inventory = {
  create() {
    return { carrot: 0, tomato: 0, strawberry: 0 };
  },
  add(inventory, itemId, quantity = 1) {
    inventory[itemId] = (inventory[itemId] || 0) + quantity;
  },
  remove(inventory, itemId, quantity = 1) {
    if ((inventory[itemId] || 0) < quantity) return false;
    inventory[itemId] -= quantity;
    return true;
  }
};
