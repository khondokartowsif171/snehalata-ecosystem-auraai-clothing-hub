<script lang="ts">
  // Aura Neural Grid mark — a 5-petal flower (snehalata = "affection creeper"),
  // alternating trust-green + heritage-gold, with an "S" seed at the core.
  let { size = 36 }: { size?: number } = $props();
</script>

<svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Snehalata">
  <g transform="translate(20,20)">
    <ellipse cx="0" cy="-10" rx="5" ry="9" fill="#10B981" transform="rotate(0)" />
    <ellipse cx="0" cy="-10" rx="5" ry="9" fill="#C79A3E" transform="rotate(72)" />
    <ellipse cx="0" cy="-10" rx="5" ry="9" fill="#10B981" transform="rotate(144)" />
    <ellipse cx="0" cy="-10" rx="5" ry="9" fill="#C79A3E" transform="rotate(216)" />
    <ellipse cx="0" cy="-10" rx="5" ry="9" fill="#10B981" transform="rotate(288)" />
  </g>
  <circle cx="20" cy="20" r="8.5" fill="#0A0F0D" stroke="#C79A3E" stroke-width="1" />
  <text x="20" y="24" text-anchor="middle" font-family="Space Grotesk, sans-serif" font-size="10" font-weight="700" fill="#C79A3E">S</text>
</svg>
