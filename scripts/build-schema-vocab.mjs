#!/usr/bin/env node
// Scarica il vocabolario ufficiale schema.org e lo converte in un file compatto
// per il validatore: src/data/schema-vocab.json. Uso: node scripts/build-schema-vocab.mjs
import { writeFileSync } from 'node:fs';

const versions = await (await fetch('https://raw.githubusercontent.com/schemaorg/schemaorg/main/versions.json')).json();
const version = versions.schemaversion;
const date = versions.releaseLog?.[version];
const url = `https://schema.org/version/${version}/schemaorg-current-https.jsonld`;
const res = await fetch(url);
if (!res.ok) throw new Error(`Download fallito: ${url} → ${res.status}`);
const graph = (await res.json())['@graph'];

const name = (id) => String(id).replace(/^schema:/, '');
const ids = (v) => (Array.isArray(v) ? v : v ? [v] : []).map((x) => name(x['@id'] ?? x));
const typesOf = (n) => (Array.isArray(n['@type']) ? n['@type'] : [n['@type']]).map(String);
const pending = (n) => ids(n['schema:isPartOf']).some((p) => p.includes('pending'));

const types = {};
const props = {};
const instances = [];
for (const n of graph) {
  const t = typesOf(n);
  const id = name(n['@id']);
  if (!n['@id']?.startsWith('schema:')) continue;
  if (t.includes('rdfs:Class')) {
    const entry = { p: ids(n['rdfs:subClassOf']).filter((x) => !x.includes(':')) };
    if (t.includes('schema:DataType')) entry.dt = 1;
    if (pending(n)) entry.pn = 1;
    const sup = ids(n['schema:supersededBy'])[0];
    if (sup) entry.s = sup;
    types[id] = entry;
  } else if (t.includes('rdf:Property')) {
    const entry = { d: ids(n['schema:domainIncludes']), r: ids(n['schema:rangeIncludes']) };
    if (pending(n)) entry.pn = 1;
    const sup = ids(n['schema:supersededBy'])[0];
    if (sup) entry.s = sup;
    props[id] = entry;
  } else {
    instances.push({ id, t: t.map(name) });
  }
}

// Membri delle enumerazioni (es. InStock → ItemAvailability) e datatype come Text o URL.
const members = {};
for (const { id, t } of instances) {
  const cls = t.find((x) => types[x]);
  if (cls) members[id] = cls;
}

const out = { version, date, source: url, types, props, members };
writeFileSync(new URL('../src/data/schema-vocab.json', import.meta.url), JSON.stringify(out));
console.log(`schema.org ${version} (${date}): ${Object.keys(types).length} tipi, ${Object.keys(props).length} proprietà, ${Object.keys(members).length} valori di enumerazione`);
