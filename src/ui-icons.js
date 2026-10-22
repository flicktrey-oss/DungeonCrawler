// Original line icons, kept inline so the HUD works without asset downloads.
const paths={
 compass:'<circle cx="12" cy="12" r="9"/><path d="m16 8-3 5-5 3 3-5Z"/>',
 journal:'<path d="M6 3h13v18H6a3 3 0 0 1 0-6h13M6 3a3 3 0 0 0-3 3v12M8 7h7M8 10h5"/>',
 menu:'<path d="M5 6h14M5 12h14M5 18h14"/>',
 chronicle:'<path d="M6 4h14v14H9l-5 3V6a2 2 0 0 1 2-2ZM8 8h8M8 12h6"/>',
 hand:'<path d="M7 13V6a2 2 0 0 1 4 0v5-7a2 2 0 0 1 4 0v8-5a2 2 0 0 1 4 0v9c0 4-3 6-7 6-3 0-4-2-6-4l-3-4a2 2 0 0 1 3-3l3 3"/>',
 potion:'<path d="M9 3h6M10 3v6l-5 7a4 4 0 0 0 3 5h8a4 4 0 0 0 3-5l-5-7V3M7 15h10"/><path d="M9 18h3"/>',
 vision:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
 bag:'<path d="M8 7V5a4 4 0 0 1 8 0v2M5 7h14l2 14H3ZM9 7v3M15 7v3M8 16h8"/>',
 armor:'<path d="m8 3 4 3 4-3 6 5-4 4v9H6v-9L2 8Zm0 0v5h8V3"/>',
 wait:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
 down:'<path d="M6 3h12v18H6ZM12 6v11m-4-4 4 4 4-4"/>',
 up:'<path d="M6 3h12v18H6ZM12 18V7m-4 4 4-4 4 4"/>'
};
export function mountIcons(root=document){for(const slot of root.querySelectorAll('[data-icon]'))slot.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[slot.dataset.icon]??''}</svg>`;}
