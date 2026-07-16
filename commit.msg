fix(net): make host authoritative for pause + map, smooth guest view

- map/scene: host now picks the scene and syncs its index to the guest via
  the snapshot, so both sides load the SAME map (previously the guest picked
  its own random scene, causing the "can't load the map" mismatch)
- pause: host is now the sole authority. The guest only SENDS a pause request;
  the host toggles and broadcasts `paused` in the snapshot. Neither side can
  freeze the other unilaterally. Host keeps streaming snapshots while paused so
  the guest sees the pause and can still request unpause (no deadlock)
- smoothness: raised host snapshot rate 20Hz -> 30Hz and added client-side
  interpolation (eased positions for the foe, enemies, and the local avatar /
  camera) so the guest view is no longer choppy
