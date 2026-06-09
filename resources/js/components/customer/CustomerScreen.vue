<template>
  <div class="relative min-h-[calc(100vh-5rem)]">
    <div
      class="pointer-events-none fixed inset-0 opacity-60"
      aria-hidden="true"
      style="background-image: radial-gradient(circle at 1px 1px, rgba(215, 163, 93, 0.07) 1px, transparent 0); background-size: 22px 22px;"
    />
    <div class="relative px-[18px]">
      <slot />
    </div>
  </div>
</template>
