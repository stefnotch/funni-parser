<script setup lang="ts">
import { ref, computed } from "vue";
import { useEditor } from "./editor";

const editor = useEditor();

function RenderTextBox() {
  return editor.textBox.value.render();
}
</script>

<template>
  <header>Parser</header>

  <main class="grid">
    <div tabindex="0" @keydown="editor.handleKeyDown">
      <h3>Input</h3>
      <RenderTextBox />
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
