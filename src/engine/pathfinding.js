/* 연결 노드 그래프 BFS 길찾기 */
window.KOMSCO = window.KOMSCO || {};
window.KOMSCO.Pathfinding = {
  shortestPath(nodes, edges, startId, endId) {
    const adjacency = {};
    Object.keys(nodes).forEach(id => { adjacency[id] = []; });
    edges.forEach(([a, b]) => {
      adjacency[a].push(b);
      adjacency[b].push(a);
    });

    const queue = [startId];
    const previous = { [startId]: null };

    while (queue.length) {
      const current = queue.shift();
      if (current === endId) break;
      for (const next of adjacency[current]) {
        if (!(next in previous)) {
          previous[next] = current;
          queue.push(next);
        }
      }
    }

    if (!(endId in previous)) return [];

    const result = [];
    for (let current = endId; current; current = previous[current]) {
      result.unshift(current);
    }
    return result;
  }
};
