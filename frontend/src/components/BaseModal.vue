<template>
  <Teleport to="body">
    <div class="modal-overlay" v-if="modelValue" @click.self="close">
      <div class="modal glass-card" :style="{ width: width, maxWidth: maxWidth }">
        <div class="modal-header">
          <h3>{{ title }}</h3>
          <button class="close-btn" @click="close">&times;</button>
        </div>
        <div class="modal-body">
          <slot />
        </div>
        <div class="modal-footer" v-if="$slots.footer">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '' },
  width: { type: String, default: '500px' },
  maxWidth: { type: String, default: '85vw' }
})

const emit = defineEmits(['update:modelValue'])

function close() {
  emit('update:modelValue', false)
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  padding: 32px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.modal-header h3 {
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 24px;
  cursor: pointer;
  line-height: 1;
}

.close-btn:hover {
  color: var(--text-primary);
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 24px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
}
</style>
