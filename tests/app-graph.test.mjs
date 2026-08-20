import assert from 'node:assert/strict';

await import('../app-graph.js');
const { buildGraph } = globalThis.BaseAppGraph;

const A='0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const B='0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const tx=(timeStamp,to,input='0x1234')=>({timeStamp:String(timeStamp),to,input});

const graph=buildGraph([
  tx(100,A),
  tx(200,A),
  tx(300,B),
  tx(400,'0xcccccccccccccccccccccccccccccccccccccccc','0x')
]);

assert.equal(graph.total,3);
assert.equal(graph.nodes.length,2);
assert.equal(graph.nodes[0].address,A);
assert.equal(graph.nodes[0].count,2);
assert.equal(graph.nodes[0].first,100);
assert.equal(graph.nodes[0].last,200);
assert.equal(graph.nodes[0].repeat,true);
assert.equal(Math.round(graph.nodes[0].share*100),67);
assert.equal(graph.nodes[1].address,B);

console.log('app-graph tests passed');
