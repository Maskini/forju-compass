import test from "node:test";
import assert from "node:assert/strict";
import {projectSeed} from "../lib/project-seed.ts";
test("draft uses the visitor’s description, never assistant suggestions or unrelated follow-ups",()=>{
 const description="Our class project compares the air in two rooms.";
 assert.deepEqual(projectSeed([{question:description,answer:"Title: Invented"},{question:"Wie teuer ist das?"}]),{description,title:"",goal:""});
 assert.equal(projectSeed([{question:"Wie kann ich meine Diplomarbeit einreichen?"}]).description,"");
});
test("explicit titles and goals carry across turns without adding stale project details",()=>{
 assert.deepEqual(projectSeed([{question:"Mein Projekt ist ein Roboter."},{question:"Unsere Klasse baut ein Thermometer."},{question:"Projekttitel: Warm oder kalt?\nZiel: Temperaturen vergleichen"}]).goal,"Temperaturen vergleichen");
 assert.deepEqual(projectSeed([{question:"Our class project compares air quality.\nTitle: Clear air\nGoal: Share the measurements"}]),{title:"Clear air",description:"Our class project compares air quality.",goal:"Share the measurements"});
});
