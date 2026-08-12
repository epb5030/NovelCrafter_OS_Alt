import { getDatabase } from '../config/database';

export class SampleTemplateService {
  /**
   * Generates a fully populated sample novel project for quickstart & exploration.
   */
  static async createSampleProject(): Promise<number> {
    const db = await getDatabase();

    // 1. Create Project
    const projectResult = await db.run(`
      INSERT INTO projects (title, summary, genre)
      VALUES (?, ?, ?)
    `, 
      'The Cartographer of Eldoria',
      'Master cartographer Valerius uncovers a constellation map leading to the forgotten sky citadel of Eldor, pursued by the Shadow Guild.',
      'High Fantasy / Exploration'
    );

    const projectId = projectResult.lastID!;

    // 2. Create Codex Entries
    const valeriusRes = await db.run(`
      INSERT INTO codex_entries (
        project_id, name, aliases, category, description, notes, 
        voice_traits, catchphrases, formality_level, pace_cadence
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      projectId,
      'Valerius the Cartographer',
      'Val, The Pathfinder',
      'character',
      'Chief cartographer of the Emerald Guild, scholar of ancient ley lines.',
      'Carries a brass astrolabe inherited from his mentor.',
      'Measured, scholarly, uses geographical and stellar metaphors',
      'By the constellation of stars',
      4,
      'eloquent'
    );
    const valeriusId = valeriusRes.lastID!;

    const lyraRes = await db.run(`
      INSERT INTO codex_entries (
        project_id, name, aliases, category, description, notes, 
        voice_traits, catchphrases, formality_level, pace_cadence
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      projectId,
      'Lyra Sunstriker',
      'Lyra, Captain Sunstriker',
      'character',
      'Veteran scout and sellsword hired to guard the expedition.',
      'Expert with twin daggers and crossbow.',
      'Sharp, energetic, pragmatic, direct',
      'Keep your head down and eyes open',
      2,
      'punchy'
    );
    const lyraId = lyraRes.lastID!;

    const citadelRes = await db.run(`
      INSERT INTO codex_entries (project_id, name, category, description, notes)
      VALUES (?, ?, ?, ?, ?)
    `,
      projectId,
      'Highspire Citadel',
      'location',
      'Ancient stone fortress perched atop the clouds on Mount Eldor.',
      'Abandoned during the Great Cataclysm two centuries ago.'
    );
    const citadelId = citadelRes.lastID!;

    const harborRes = await db.run(`
      INSERT INTO codex_entries (project_id, name, category, description, notes)
      VALUES (?, ?, ?, ?, ?)
    `,
      projectId,
      'Emerald Bay Docks',
      'location',
      'Bustling coastal trade harbor and home of the Cartographers Guild.',
      'Lined with shipyards, sea taverns, and merchant vaults.'
    );
    const harborId = harborRes.lastID!;

    const astrolabeRes = await db.run(`
      INSERT INTO codex_entries (project_id, name, category, description, notes)
      VALUES (?, ?, ?, ?, ?)
    `,
      projectId,
      'Astrolabe of Eldor',
      'item',
      'Enchanted brass navigation device that reveals hidden ley-line pathways.',
      'Resonates with celestial alignments.'
    );
    const astrolabeId = astrolabeRes.lastID!;

    // 3. Create Codex Relationships
    await db.run(`
      INSERT INTO codex_relationships (project_id, source_id, target_id, relationship_type, description)
      VALUES (?, ?, ?, ?, ?)
    `, projectId, valeriusId, lyraId, 'ally', 'Trusted scout and sworn expedition protector');

    await db.run(`
      INSERT INTO codex_relationships (project_id, source_id, target_id, relationship_type, description)
      VALUES (?, ?, ?, ?, ?)
    `, projectId, valeriusId, astrolabeId, 'owns', 'Inherited from Master Cartographer Thorne');

    await db.run(`
      INSERT INTO codex_relationships (project_id, source_id, target_id, relationship_type, description)
      VALUES (?, ?, ?, ?, ?)
    `, projectId, valeriusId, citadelId, 'located_in', 'Expedition destination');

    // 4. Create Outline (Act -> Chapter -> Scene)
    const act1Res = await db.run(`
      INSERT INTO outline_elements (project_id, type, title, position, summary)
      VALUES (?, 'act', 'Act I: The Forgotten Chart', 1, 'Valerius discovers the map and hires Lyra for the journey.')
    `, projectId);
    const act1Id = act1Res.lastID!;

    const chap1Res = await db.run(`
      INSERT INTO outline_elements (project_id, parent_id, type, title, position, summary)
      VALUES (?, ?, 'chapter', 'Chapter 1: The Dust of Vaults', 1, 'Unsealing the ancient map tube.')
    `, projectId, act1Id);
    const chap1Id = chap1Res.lastID!;

    const scene1Res = await db.run(`
      INSERT INTO outline_elements (project_id, parent_id, type, title, position, summary, status, metadata)
      VALUES (?, ?, 'scene', 'Scene 1: The Sealed Map Case', 1, 'Valerius opens the lead-sealed tube.', 'done', ?)
    `, projectId, chap1Id, JSON.stringify([valeriusId, astrolabeId]));
    const scene1Id = scene1Res.lastID!;

    await db.run(`
      INSERT INTO scene_contents (scene_id, content)
      VALUES (?, ?)
    `, scene1Id, `The parchment felt unexpectedly warm against Valerius's gloved fingers. Dust motes danced in the shaft of amber amber light streaming through the high arched window of the Guild vault.

"By the constellation of stars," Valerius whispered, adjusting his magnifying monocle. 

The ink was not sea-tallow or charcoal black. It shimmered with silver mica, tracing mountain ranges that no modern chart had ever depicted. At the center stood a high peak encircled by seven stars: Highspire Citadel.`);

    const scene2Res = await db.run(`
      INSERT INTO outline_elements (project_id, parent_id, type, title, position, summary, status, metadata)
      VALUES (?, ?, 'scene', 'Scene 2: Whispers in the Harbor Tavern', 2, 'Valerius meets Lyra at the Salty Gull.', 'drafting', ?)
    `, projectId, chap1Id, JSON.stringify([valeriusId, lyraId, harborId]));
    const scene2Id = scene2Res.lastID!;

    await db.run(`
      INSERT INTO scene_contents (scene_id, content)
      VALUES (?, ?)
    `, scene2Id, `Rain beat heavy rhythms against the leaded panes of the Salty Gull tavern. Sea captains clinked heavy pewter mugs, their voices lost in the storm roar outside.

Lyra Sunstriker spun a silver dagger between her knuckles. "You want to march up Mount Eldor in mid-winter? Scholar, men freeze solid up there before noon."

Valerius unrolled a corner of the parchment onto the oak table. "Not if we follow the subterranean ley line marked right here."

Lyra paused, her eyes narrowing as she studied the glowing silver ink. "Keep your head down and eyes open, Cartographer. We leave at first light."`);

    // 5. Create Cartography Pins & Journeys
    const pin1Res = await db.run(`
      INSERT INTO map_pins (project_id, codex_location_id, title, x, y, pin_type, notes)
      VALUES (?, ?, 'Emerald Bay Docks', 25.0, 70.0, 'city', 'Expedition departure port.')
    `, projectId, harborId);
    const pin1Id = pin1Res.lastID!;

    const pin2Res = await db.run(`
      INSERT INTO map_pins (project_id, codex_location_id, title, x, y, pin_type, notes)
      VALUES (?, ?, 'Highspire Citadel', 75.0, 20.0, 'fortress', 'Ancient sky citadel.')
    `, projectId, citadelId);
    const pin2Id = pin2Res.lastID!;

    await db.run(`
      INSERT INTO map_journeys (project_id, character_id, path_waypoints, color, notes)
      VALUES (?, ?, ?, '#c89d54', 'Valerius expedition journey path')
    `, projectId, valeriusId, JSON.stringify([pin1Id, pin2Id]));

    // 6. Create Timeline Events
    await db.run(`
      INSERT INTO timeline_events (project_id, track, title, date_label, order_index, description, importance, character_id)
      VALUES (?, 'main_story', 'Discovery of the Astrolabe Chart', '1042-11-04', 1.0, 'Valerius finds the chart in Guild archives.', 'turning_point', ?)
    `, projectId, valeriusId);

    await db.run(`
      INSERT INTO timeline_events (project_id, track, title, date_label, order_index, description, importance)
      VALUES (?, 'world_history', 'The Great Cataclysm', '0920-05-15', 0.5, 'Fall of Highspire Citadel during celestial eclipse.', 'climax')
    `, projectId);

    // 7. Create Character Arc Matrix Records
    await db.run(`
      INSERT INTO scene_character_matrix (project_id, scene_id, character_id, role, emotional_state, tension_level)
      VALUES (?, ?, ?, 'pov', 'Intrigued & Determined', 3)
    `, projectId, scene1Id, valeriusId);

    await db.run(`
      INSERT INTO scene_character_matrix (project_id, scene_id, character_id, role, emotional_state, tension_level)
      VALUES (?, ?, ?, 'participant', 'Watchful & Skeptical', 4)
    `, projectId, scene2Id, lyraId);

    return projectId;
  }
}
