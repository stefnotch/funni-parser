<script setup lang="ts">
import { ref, computed } from "vue";
import { useEditor } from "./editor";
import { astToDiagram } from "./ast-to-diagram";
// @ts-ignore
import VueMermaidString from "vue-mermaid-string";

const editor = useEditor();

const showDiagram = ref(true);
const diagram = computed(() => {
  return astToDiagram(editor.ast.value);
});

function RenderTextBox() {
  return editor.textBox.value.render();
}
function RenderDebugTextBox() {
  return editor.debugTextBox.value.render();
}
</script>

<template>
  <header>Parser</header>

  <main class="grid">
    <div>
      <h3>Input</h3>
      <div tabindex="0" @keydown="editor.handleKeyDown">
        <RenderTextBox />
      </div>
      <RenderDebugTextBox />
      <h3>Ast</h3>
      <label>
        <input type="checkbox" v-model="showDiagram" /> Show diagram
      </label>
      <VueMermaidString v-if="showDiagram" :value="diagram" />
    </div>
    <div class="grid">
      <div>
        <h3>Lexer</h3>
        <pre><code>{{ JSON.stringify(editor.tokens.value, null, 2)}}</code></pre>
      </div>
      <div>
        <h3>Ast</h3>
        <pre><code>{{ JSON.stringify(editor.ast.value, null, 2)}}</code></pre>
      </div>
    </div>
  </main>
</template>

<style scoped>
header {
  line-height: 1.5;
}
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-gap: 1rem;
}
</style>
