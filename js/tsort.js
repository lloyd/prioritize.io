// http://en.wikipedia.org/wiki/Topological_sorting
function tsort(E, num) {
  //+ Jonas Raoni Soares Silva
  //@ http://jsfromhell.com/array/shuffle [v1.0]
  function shuffle(o){ //v1.0
    for(var j, x, i = o.length; i; j = parseInt(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
  };

  var L = [];
  var S = [];

  function incomingEdges(n) {
    var cnt = 0;
    for (var i = 0; i < E.length; i++)
      if (E[i][1] == n) cnt++;
    return cnt;
  }

  // find all nodes with no incoming edges, iterate in
  // random order for random results
  var nodes = [];
  for (var i = 0; i < num; i++) nodes.push(i);
  nodes = shuffle(nodes);

  for (var i = 0; i < num; i++) {
    if (!incomingEdges(nodes[i])) S.push(nodes[i]);
  }

  while (S.length) {
    var n = S.pop();
    L.push(n);
    var EN = [];
    for (var j = 0; j < E.length; j++) {
      if (E[j][0] == n) {
        var m = E[j][1];
        if (incomingEdges(m) == 1) S.push(m);
      } else {
        EN.push(E[j]);
      }
    }
    E = EN;
  }

  return L;
}

// returns null if the edges result in a fully unique sorting, otherwise returns a
// pair of entries that we would like the answer to.
function nextQuestion(E, num) {
  var sorted = tsort(E, num);

  function hasEdge(n, m) {
    for (var i = 0; i < E.length; i++) {
      if (E[i][0] == n && E[i][1] == m ||
          E[i][1] == n && E[i][0] == m) return true;
    }
    return false;
  }

  // each consecutive node in the graph should be conected by an edge
  for (var i = 0; i < sorted.length - 1; i++) {
    if (!hasEdge(sorted[i], sorted[i+1]))
      return [sorted[i], sorted[i+1]];
  }

  return null;
}
