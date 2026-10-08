/* Configurable professional taxonomy and additive demo migration. */
(function (root) {
  "use strict";
  const clone = (x) => JSON.parse(JSON.stringify(x)),
    next = (a) => Math.max(0, ...a.map((x) => x.id || 0)) + 1;
  const groups = {
    MUSIC: {
      name: "Music",
      specialties:
        "Pianist|Keyboardist|Synth Player|Piano Bar|Musical Director|Acoustic Guitar|Electric Guitar|Classical Guitar|Bass Guitar|Violin|Viola|Cello|Double Bass|String Ensemble|Saxophone|Trumpet|Trombone|Flute|Clarinet|Drums|Congas|Bongos|Timbales|Percussionist|Accordion|Harmonica|Ukulele|Organ|DJ Hybrid",
      skills: "Repertoire|Sight Reading|Jazz|Latin|Bachata|Merengue|Salsa",
    },
    DJ: {
      name: "DJs",
      specialties:
        "Club DJ|Wedding DJ|Resort DJ|Beach DJ|Corporate DJ|Lounge DJ|Open Format DJ|EDM DJ|House DJ|Techno DJ|Latin DJ|Reggaeton DJ|Afrobeats DJ|Hip Hop DJ|Tropical DJ|Vinyl DJ|Broadcast DJ|DJ / Music Director",
      skills: "Controller|Mixing|Vinyl|Ableton|Rekordbox",
    },
    VOCAL: {
      name: "Vocals",
      specialties:
        "Lead Vocal|Background Vocal|Male Vocal|Female Vocal|Duet|Trio|Harmony Vocalist|Choir|Specialty Vocalist",
      skills: "Harmony|Repertoire|English|Spanish",
    },
    BAND: {
      name: "Band / Group",
      specialties:
        "Duo|Trio|Quartet|Quintet|Small Band|Cover Band|Wedding Band|Show Band|House Band|Jazz Band|Latin Band|Salsa Band|Merengue Band|Bachata Group|Rock Band|Pop Band|Dance Band|Orchestra|Big Band|String Ensemble|Choir|Custom Group",
      skills: "Live Show|Repertoire|Team Coordination",
    },
    MUSICAL_DIRECTION: {
      name: "Musical Direction",
      specialties:
        "Musical Director|Band Director|Orchestra Director|Choir Director|Arranger|Composer|Producer|Rehearsal Director|Vocal Director",
      skills: "Arrangement|Composition|Rehearsal",
    },
    DANCE: {
      name: "Dance",
      specialties:
        "Ballet|Contemporary|Modern|Jazz|Hip Hop|Urban|Salsa|Bachata|Merengue|Latin Dance|Ballroom|Kizomba|Afro Dance|Caribbean Dance|Commercial Dance|Show Dance|Folkloric Dance|Traditional Dance|Dance Crew|Choreographer|Dance Instructor|Dance Captain",
      skills: "Choreography|Latin Dance|Show Dance|Group Performance",
    },
    PERFORMANCE: {
      name: "Performance",
      specialties:
        "Comedian|Stand-up|Actor|Theater Performer|Improvisation|Character Performer|Impersonator|Magician|Illusionist|Mentalist|Spoken Word|Poet|Storyteller|Specialty Performer",
      skills: "Stage Presence|Improvisation",
    },
    ACROBATICS: {
      name: "Circus & Acrobatics",
      sensitive: true,
      specialties:
        "Acrobat|Aerialist|Aerial Hoop|Aerial Silks|Trapeze|Pole Performer|Contortionist|Hand Balancer|Tumbling|Gymnastic Performer|Fire Performer|Juggler|Stilt Walker|Unicycle Performer|Circus Artist|Acrobatic Group",
      skills: "Aerial Silks|Aerial Hoop|Rigging Safety|Balance",
    },
    HOSTING: {
      name: "Hosting & Entertainment",
      specialties:
        "Event Host|MC|Presenter|Announcer|Brand Ambassador|Animator|Resort Animator|Kids Entertainer|Party Host|Game Host|Karaoke Host|Trivia Host|Cultural Host|Experience Host",
      skills: "English|Spanish|Public Speaking",
    },
    AUDIO: {
      name: "Audio",
      technical: true,
      specialties:
        "Sound Engineer|FOH Engineer|Monitor Engineer|System Engineer|Audio Technician|RF Technician|RF Coordinator|Wireless Technician|Microphone Technician|Backline Technician|Stage Audio Technician|Recording Engineer|Broadcast Audio Engineer|Live Sound Mixer|Audio Assistant|Audio Crew",
      skills:
        "Digital Consoles|Analog Consoles|Dante|AES67|IEM|RF|Line Arrays|Stage Boxes|Monitoring|Recording",
    },
    LIGHTING: {
      name: "Lighting",
      technical: true,
      specialties:
        "Lighting Designer|Lighting Director|Lighting Programmer|Lighting Operator|Lighting Technician|Followspot Operator|Moving Light Programmer|Console Programmer|Lighting Assistant|Rigging Lighting Technician|Lighting Crew",
      skills:
        "DMX|Art-Net|sACN|Moving Heads|LED|Pixel Mapping|Concert Lighting|Theatrical Lighting|Hospitality Lighting",
    },
    VIDEO: {
      name: "Video",
      technical: true,
      specialties:
        "Video Engineer|Video Technician|LED Technician|LED Wall Operator|Video Director|VJ|Playback Operator|Media Server Operator|Projection Technician|Camera Operator|Live Camera Operator|Broadcast Technician|Streaming Technician|Video Switcher|Camera Director|Video Assistant|Video Crew",
      skills:
        "LED Wall|Video Mapping|Projection|Live Streaming|Multicamera|Broadcast|Media Servers|Playback|Video Switching",
    },
    STAGE: {
      name: "Stage",
      technical: true,
      specialties:
        "Stage Manager|Assistant Stage Manager|Stagehand|Stage Technician|Stage Crew|Set Technician|Set Builder|Carpenter|Scenic Technician|Props Technician|Backline Crew|Stage Assistant|Stage Coordinator",
      skills: "Load-in|Stage Management|Strike|Backline",
    },
    RIGGING: {
      name: "Rigging",
      technical: true,
      sensitive: true,
      specialties:
        "Rigger|Head Rigger|Rigging Technician|Aerial Rigging Technician|Truss Technician|Motor Technician|Hoist Operator|Rigging Supervisor",
      skills: "Truss|Hoists|Rigging Safety",
    },
    TECHNICAL_PRODUCTION: {
      name: "Technical Production",
      technical: true,
      specialties:
        "Technical Director|Technical Producer|AV Manager|Technical Manager|Venue Technical Manager|Production Technical Manager|Event Technology Manager|AV Technician",
      skills: "AV Systems|Show Coordination|Technical Planning",
    },
    PRODUCTION: {
      name: "Event Production",
      technical: true,
      specialties:
        "Event Producer|Executive Producer|Technical Producer|Production Manager|Production Coordinator|Show Caller|Show Director|Stage Director|Event Coordinator|Production Assistant|Runner|Production Crew",
      skills: "Event Logistics|Production Planning|Show Calling",
    },
    SHOW_CONTROL: {
      name: "Show Control",
      technical: true,
      specialties:
        "Show Caller|Show Control Operator|Playback Operator|Timecode Operator|Cue Operator|Automation Operator|Technical Director|Show Control Assistant",
      skills: "Timecode|Cues|Automation|Playback",
    },
    SPECIAL_EFFECTS: {
      name: "Special Effects",
      technical: true,
      sensitive: true,
      specialties:
        "FX Technician|CO2 Effects Technician|Confetti Operator|Cryo Effects Technician|Special Effects Operator|Atmospheric Effects Technician|Pyro Specialist|Special Effects Crew",
      skills: "FX Control|Safety Documentation",
    },
    CREATIVE: {
      name: "Creative",
      specialties:
        "Event Photographer|Videographer|Editor|Motion Designer|Graphic Designer|Content Creator|Social Content Creator|Event Content Producer|Visual Artist",
      skills: "Photography|Editing|Video|Motion Design",
    },
    HOSPITALITY: {
      name: "Hospitality Entertainment",
      specialties:
        "Resort Entertainer|Hotel Entertainer|Lobby Performer|Piano Bar Performer|Pool Performer|Beach Performer|Restaurant Performer|Lounge Performer|Nightlife Performer|Specialty Resort Performer",
      skills: "English|Spanish|Hospitality",
    },
    EQUIPMENT: {
      name: "Equipment Providers",
      technical: true,
      specialties:
        "Sound Rental|Lighting Rental|LED Wall Rental|Backline Rental|Stage Rental|Rigging Company|AV Company|Production Company",
      skills: "Inventory|Rental|Installation",
    },
    OTHER: {
      name: "Other Specialized Services",
      specialties: "Specialized Professional",
      skills: "Custom Service",
    },
  };
  const types = [
    "INDIVIDUAL",
    "TEAM",
    "DUO",
    "TRIO",
    "BAND",
    "CREW",
    "AGENCY",
    "COMPANY",
    "PRODUCTION TEAM",
  ];
  const rateKeys = [
    "hourly_rate",
    "half_day_rate",
    "full_day_rate",
    "event_rate",
    "show_rate",
    "series_rate",
    "monthly_rate",
    "residency_rate",
    "travel_fee",
    "overtime_rate",
    "setup_fee",
    "teardown_fee",
    "night_rate",
    "holiday_rate",
  ];
  const registryKinds = [
    "CATEGORY",
    "SUBCATEGORY",
    "SPECIALTY",
    "SKILL",
    "CERTIFICATION",
    "SERVICE",
    "EVENT_TYPE",
    "EQUIPMENT_CATEGORY",
  ];
  function taxonomy() {
    const rows = [];
    for (const [key, g] of Object.entries(groups)) {
      const id = next(rows);
      rows.push({
        id,
        key,
        name: g.name,
        kind: "CATEGORY",
        parent_id: null,
        enabled: true,
        order: id,
        technical: !!g.technical,
        sensitive: !!g.sensitive,
      });
      for (const kind of ["SPECIALTY", "SKILL"])
        for (const name of g[
          kind === "SPECIALTY" ? "specialties" : "skills"
        ].split("|"))
          rows.push({
            id: next(rows),
            key: key + "-" + name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
            name,
            kind,
            parent_id: id,
            enabled: true,
            order: rows.length,
          });
    }
    return rows;
  }
  function category(db, key) {
    return db.arti.taxonomy.find((t) => t.kind === "CATEGORY" && t.key === key);
  }
  function categoryOptions(db) {
    return db.arti.taxonomy
      .filter((t) => t.kind === "CATEGORY" && t.enabled)
      .sort((a, b) => a.order - b.order);
  }
  function compatible(profile, requirement) {
    if (!requirement?.category_key) return true;
    return (
      profile.primary_category === requirement.category_key ||
      profile.specialties?.some(
        (s) => s.category_key === requirement.category_key,
      )
    );
  }
  function qualified(profile, requirement) {
    return (
      compatible(profile, requirement) &&
      (!requirement.skills?.length ||
        requirement.skills.every((s) => profile.skills?.includes(s))) &&
      (!requirement.requires_certification ||
        profile.certifications?.some(
          (c) =>
            c.verification_status === "VERIFIED_DEMO" &&
            (!c.expiration_date ||
              Date.parse(c.expiration_date + "T23:59:59Z") > Date.now()),
        ))
    );
  }
  function seed(db) {
    const a = db.arti;
    if (!a) return;
    if (a.talent_version === 1) {
      ensureCoverage(db);
      return;
    }
    a.taxonomy = taxonomy();
    a.equipment_categories = [
      "Audio",
      "Lighting",
      "Video",
      "Backline",
      "Stage",
      "Rigging",
    ];
    a.equipment_models = [];
    a.equipment = [];
    a.equipment_requirements = [];
    a.equipment_rentals = [];
    a.penalty_rules = [
      {
        id: 1,
        category_key: "MUSIC",
        delay_minutes: 15,
        fee: 2500,
        severity: "WARNING",
      },
      {
        id: 2,
        category_key: "LIGHTING",
        delay_minutes: 15,
        fee: 4000,
        severity: "WARNING",
      },
      {
        id: 3,
        category_key: "AUDIO",
        delay_minutes: 15,
        fee: 3500,
        severity: "WARNING",
      },
    ];
    let cats = {};
    for (const t of categoryOptions(db)) {
      let c = db.categories.find((x) => x.talent_key === t.key);
      if (!c) {
        c = {
          id: next(db.categories),
          name: t.name,
          icon: t.technical ? "grid" : "music",
          talent_key: t.key,
        };
        db.categories.push(c);
      }
      cats[t.key] = c.id;
    }
    const oldMap = {
      1: "MUSIC",
      2: "MUSIC",
      3: "DJ",
      4: "VOCAL",
      5: "MUSIC",
      6: "BAND",
    };
    for (const p of db.artists) {
      p.primary_category ||= oldMap[p.category_id] || "MUSIC";
      p.profile_type ||= p.category_id === 6 ? "CREW" : "MUSICIAN";
      p.entity_type ||= p.category_id === 6 ? "BAND" : "INDIVIDUAL";
      p.specialties ||= [
        {
          name:
            db.categories.find((c) => c.id === p.category_id)?.name || "Music",
          category_key: p.primary_category,
        },
      ];
      p.skills ||= ["Repertoire"];
      p.roles ||= ["ARTIST"];
      p.rates ||= Object.fromEntries(
        rateKeys.map((k) => [
          k,
          k === "event_rate" ? (p.demo_price_usd || 250) * 100 : 0,
        ]),
      );
      p.rates.currency ||= "USD";
      p.certifications ||= [];
      p.languages ||= ["Español", "English"];
      p.professional_level ||= "Profesional";
      p.enterprise_ready = true;
      p.equipment_mode ||= "HAS_EQUIPMENT";
      p.years_experience ||= 7;
      p.projects ||= ["Eventos y venues de muestra"];
      p.venues_worked ||= ["Grand Caribe Resort"];
    }
    const populations = [
      ["AUDIO", "Sound Engineer", 3],
      ["LIGHTING", "Lighting Technician", 3],
      ["LIGHTING", "Lighting Designer", 2],
      ["VIDEO", "Video Technician", 2],
      ["STAGE", "Stage Manager", 2],
      ["STAGE", "Stagehand", 2],
      ["DANCE", "Dancer", 3],
      ["DANCE", "Dance Crew", 2],
      ["ACROBATICS", "Acrobat", 2],
      ["ACROBATICS", "Aerialist", 2],
      ["HOSTING", "Host / MC", 2],
      ["CREATIVE", "Event Photographer", 2],
      ["CREATIVE", "Videographer", 2],
      ["PRODUCTION", "Production Manager", 2],
      ["TECHNICAL_PRODUCTION", "Technical Director", 2],
      ["TECHNICAL_PRODUCTION", "AV Technician", 2],
      ["EQUIPMENT", "Equipment Provider", 2],
      ["PRODUCTION", "Production Company", 2],
    ];
    const names = [
      "David Rivera",
      "Carla Santos",
      "Marco Díaz",
      "Lucía Méndez",
      "Andrés Peña",
      "Camila Torres",
      "Joel Castillo",
      "Valeria Cruz",
      "Iván Reyes",
      "Laura Solís",
    ];
    const base = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Santo_Domingo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    const date = (n) => {
      const d = new Date(base + "T12:00:00Z");
      d.setUTCDate(d.getUTCDate() + n);
      return d.toISOString().slice(0, 10);
    };
    const original = clone(db.artists[0]);
    let index = 0;
    for (const [key, specialty, count] of populations)
      for (let i = 0; i < count; i++) {
        const id = next(db.users),
          g = groups[key],
          entity = specialty.includes("Crew")
            ? "CREW"
            : specialty.includes("Company") || key === "EQUIPMENT"
              ? "COMPANY"
              : "INDIVIDUAL",
          name =
            entity === "INDIVIDUAL"
              ? names[index % names.length] +
                " " +
                (Math.floor(index / names.length) + 1)
              : specialty + " Caribe " + (i + 1);
        const u = {
          id,
          name,
          email: "talent" + index + "@artivo.demo",
          role: "ARTIST",
          demo_role: "ARTIST",
          suspended: 0,
          phone: "",
          created_at: new Date().toISOString(),
        };
        db.users.push(u);
        const rate =
          key === "LIGHTING" ? 18000 : key === "DANCE" ? 18500 : 25000;
        const p = {
          ...clone(original),
          user_id: id,
          stage_name: name,
          category_id: cats[key],
          primary_category: key,
          profile_type:
            entity !== "INDIVIDUAL"
              ? entity
              : g.technical
                ? "TECHNICIAN"
                : key === "DANCE"
                  ? "DANCER"
                  : key === "ACROBATICS"
                    ? "PERFORMER"
                    : key === "CREATIVE"
                      ? "CREATIVE"
                      : "PERFORMER",
          entity_type: entity,
          specialties: [{ name: specialty, category_key: key }],
          skills: g.skills.split("|").slice(0, 5),
          roles: ["ARTIST"],
          bio: `${specialty} · Perfil ficticio para producciones, shows y eventos.`,
          photo: "demo-stage.svg",
          media_url: "demo-performance.mp4",
          genres: g.skills.split("|").join(" · "),
          rate: Math.round(rate * 0.6),
          demo_price_usd: rate / 100,
          instruments: specialty,
          experience: "7 años · proyectos ficticios",
          years_experience: 7,
          projects: ["Grand Caribe show", "Convención Caribe · demo"],
          venues_worked: ["Grand Caribe Resort", "Convention Center"],
          hardware_experience: g.technical
            ? "Consolas digitales, stage boxes y sistemas AV"
            : "Equipo de presentación",
          software_experience: g.technical
            ? "Software de operación y programación"
            : "Herramientas creativas",
          equipment_mode: i % 2 ? "REQUIRES_EQUIPMENT" : "HAS_EQUIPMENT",
          equipment: "Equipo y condiciones a confirmar",
          certifications: g.sensitive
            ? [
                {
                  id: 1,
                  name: "Documento de seguridad · muestra",
                  issuer: "Demo Safety Academy",
                  issue_date: date(-365),
                  expiration_date: date(365),
                  document: "Documento sintético pendiente",
                  verification_status: "PENDING",
                  demo: true,
                },
              ]
            : [],
          languages: ["Español", "English"],
          professional_level: "Profesional",
          enterprise_ready: !g.sensitive,
          safety_requirements: g.sensitive
            ? "Validar documentos, rigging y condiciones del venue. No representa certificación real."
            : "Plan técnico y normas del venue",
          space_required: key === "ACROBATICS" ? "6 × 6 m" : "3 × 3 m",
          ceiling_height: key === "ACROBATICS" ? 6 : 0,
          floor_requirements: "Superficie estable y despejada",
          skill_level: "Profesional demo",
          setup_minutes: g.technical ? 120 : 60,
          teardown_minutes: g.technical ? 60 : 30,
          group_size: entity === "CREW" ? 4 : 1,
          rates: {
            ...Object.fromEntries(
              rateKeys.map((k) => [
                k,
                ["event_rate", "show_rate", "full_day_rate"].includes(k)
                  ? rate
                  : k === "hourly_rate"
                    ? Math.round(rate / 8)
                    : 0,
              ]),
            ),
            currency: "USD",
            custom_quote: true,
          },
          demo_stats: {
            rating: 4.8,
            punctuality: 98,
            completed: 70,
            technical_reliability: 97,
            setup_completion: 99,
            technical_incidents: 0,
            response: 95,
            professionalism: 98,
          },
          active: 1,
          verified: 0,
        };
        db.artists.push(p);
        db.availability.push({
          id: next(db.availability),
          artist_id: id,
          kind: "AVAILABLE",
          start: date(0) + "T00:00",
          end: date(730) + "T23:59",
        });
        db.posts.unshift({
          id: next(db.posts),
          artist_id: id,
          caption: g.technical
            ? "Behind the scenes · " + specialty + " · Portfolio demo"
            : "Nueva presentación · " + specialty + " · Contenido de muestra",
          media_type: index % 2 ? "VIDEO" : "IMAGE",
          media_url: index % 2 ? "demo-performance.mp4" : "demo-stage.svg",
          created_at: new Date().toISOString(),
        });
        const equipment = {
          id: next(a.equipment),
          owner_id: id,
          category: key,
          model: g.technical ? "Sistema AV de muestra" : "Equipo de muestra",
          mode: p.equipment_mode,
          demo: true,
        };
        a.equipment.push(equipment);
        const call =
          key === "STAGE"
            ? 360
            : ["LIGHTING", "VIDEO"].includes(key)
              ? 240
              : key === "AUDIO"
                ? 180
                : 60;
        const o = {
          id: next(a.opportunities),
          owner_id: 8,
          origin_id: 8,
          title:
            specialty +
            " — " +
            (key === "LIGHTING"
              ? "Weekend Residency"
              : key === "DANCE"
                ? "Resort Show"
                : "10 events"),
          category: groups[key].name,
          category_key: key,
          service_id: key + ":" + specialty,
          booking_type: g.technical
            ? "TECHNICAL_BOOKING"
            : "PERFORMANCE_BOOKING",
          city: "Punta Cana",
          venue_id: 1,
          currency: "USD",
          rate,
          quantity: 1,
          terms: 90,
          call_minutes: call,
          requirements: p.skills.join(", "),
          required_skills: [p.skills[0]],
          requires_certification: !!g.sensitive,
          negotiable: true,
          contract_type: "SERIES",
          demand_type: "EVENT SERIES",
          deadline: date(365),
          visibility: "PUBLIC",
          status: "OPEN",
          created_at: new Date().toISOString(),
          dates: Array.from({ length: 10 }, (_, j) => ({
            id: j + 1,
            start: date(15 + index * 2 + j * 7) + "T20:00-04:00",
            end: date(16 + index * 2 + j * 7) + "T00:00-04:00",
            capacity: key === "DANCE" ? 4 : key === "LIGHTING" ? 2 : 1,
          })),
          demo: true,
        };
        a.opportunities.push(o);
        for (const [offset, status] of [
          [-1, "INVOICED"],
          [1, "CONFIRMED"],
        ]) {
          const eid = next(a.events),
            start =
              date(offset < 0 ? -7 - index : 15 + index * 2) + "T20:00-04:00",
            end =
              date(offset < 0 ? -6 - index : 16 + index * 2) + "T00:00-04:00";
          const e = {
            id: eid,
            booking_id: eid,
            opportunity_id: o.id,
            date_id: offset < 0 ? 0 : 1,
            owner_id: 8,
            provider_id: id,
            performer_id: id,
            venue_id: 1,
            title:
              specialty +
              " · " +
              (offset < 0 ? "Servicio completado" : "Próximo servicio"),
            start,
            end,
            call_time: new Date(Date.parse(start) - call * 60000).toISOString(),
            rate,
            currency: "USD",
            terms: 90,
            conditions: o.requirements,
            commission_bps: a.settings.commission_bps,
            status,
            setup: offset < 0 ? "VERIFIED" : "PENDING",
            evidence: [],
            history: [],
            service_id: o.service_id,
            booking_type: o.booking_type,
            category_key: key,
            required_skills: o.required_skills,
            requires_certification: o.requires_certification,
            technical_stage: offset < 0 ? "STRIKE_COMPLETED" : "PENDING",
            operational_minutes:
              (Date.parse(end) - Date.parse(start)) / 60000 + call,
            demo: true,
          };
          a.events.push(e);
          if (offset < 0)
            a.invoices.push({
              id: next(a.invoices),
              number: "INV-" + (10000 + next(a.invoices)),
              event_id: eid,
              owner_id: 8,
              provider_id: id,
              total: rate,
              currency: "USD",
              terms: 90,
              due: date(83 - index),
              status: "ACCEPTED",
              settled: false,
              net: Math.round(rate * 0.9),
              agency_fee: 0,
              platform_fee: Math.round(rate * 0.1),
              customer_paid: false,
              payout_status: "PENDING",
              created_at: new Date().toISOString(),
              demo: true,
            });
        }
        index++;
      }
    // A mixed crew and packages share the existing leader and booking model.
    const find = (s) =>
      db.artists.filter((p) => p.specialties.some((x) => x.name === s));
    const crewMembers = [
      db.artists[0],
      find("Sound Engineer")[0],
      find("Lighting Technician")[0],
      find("Stage Manager")[0],
      ...find("Dancer"),
      db.artists.find((p) => p.primary_category === "DJ"),
      ...db.artists.filter((p) => p.primary_category === "VOCAL").slice(0, 2),
    ].filter(Boolean);
    a.teams.push({
      id: next(a.teams),
      leader_id: db.users.find((u) => u.email === "lider@artivo.demo").id,
      name: "Caribbean Show Crew",
      entity_type: "PRODUCTION TEAM",
      members: crewMembers.map((p) => ({
        user_id: p.user_id,
        instrument: p.specialties[0].name,
        status: "ACCEPTED",
      })),
      technical_requirements: "AV, stage y seguridad del venue",
      hospitality_requirements: "Agua, transporte y camerino",
      payment_splits: crewMembers.map((p) => ({
        user_id: p.user_id,
        share_bps: Math.floor(10000 / crewMembers.length),
      })),
      substitutes: [],
    });
    const slots = [
      ["DJ", 6],
      ["VOCAL", 4],
      ["DANCE", 8],
      ["HOSTING", 2],
      ["AUDIO", 3],
      ["LIGHTING", 3],
      ["STAGE", 2],
      ["CREATIVE", 2],
    ].map(([category_key, quantity], i) => ({
      id: i + 1,
      category_key,
      label: groups[category_key].name,
      quantity,
      skills: [],
    }));
    for (const [title, count, demand] of [
      ["30 profesionales · 20 eventos", 20, "MASS STAFFING"],
      ["Caribbean Show Crew · contrato de 10 eventos", 10, "FULL PRODUCTION"],
      ["Summer Entertainment Program · 40 eventos", 40, "SEASONAL CONTRACT"],
      ["FOH Engineer + Monitor Engineer", 1, "A TEAM"],
    ]) {
      const id = next(a.opportunities),
        staffing = title.startsWith("FOH")
          ? [
              {
                id: 1,
                category_key: "AUDIO",
                label: "FOH Engineer",
                quantity: 1,
                skills: ["Digital Consoles"],
              },
              {
                id: 2,
                category_key: "AUDIO",
                label: "Monitor Engineer",
                quantity: 1,
                skills: ["IEM"],
              },
            ]
          : clone(slots);
      a.opportunities.push({
        id,
        owner_id: 8,
        origin_id: 8,
        title,
        category: "Full Production",
        category_key: "FULL_PRODUCTION",
        service_id: "package:" + id,
        booking_type: "FULL_SERVICE_BOOKING",
        city: "Punta Cana",
        venue_id: 1,
        currency: "USD",
        rate: title.startsWith("FOH") ? 55000 : 150000,
        quantity: 1,
        terms: 90,
        call_minutes: 360,
        requirements:
          "Equipo mixto · asignaciones por profesión · transporte y plan técnico",
        staffing,
        negotiable: true,
        contract_type: "SERIES",
        demand_type: demand,
        deadline: date(365),
        visibility: "PUBLIC",
        status: "OPEN",
        created_at: new Date().toISOString(),
        dates: Array.from({ length: count }, (_, j) => ({
          id: j + 1,
          start: date(150 + j * 2) + "T20:00-04:00",
          end: date(151 + j * 2) + "T00:00-04:00",
          capacity: 1,
        })),
        demo: true,
      });
    }
    a.talent_version = 1;
    ensureCoverage(db);
  }
  function ensureCoverage(db) {
    const a = db.arti;
    if (a.coverage_version === 1) return;
    const date = (n) => {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() + n);
      return d.toISOString().slice(0, 10);
    };
    for (const cat of categoryOptions(db)) {
      if (db.artists.some((p) => p.primary_category === cat.key)) continue;
      const template = clone(
        db.artists.find((p) => p.profile_type === "TECHNICIAN"),
      );
      const userId = next(db.users),
        index = db.artists.length;
      const specialty = a.taxonomy.find(
        (t) => t.parent_id === cat.id && t.kind === "SPECIALTY",
      );
      db.users.push({
        id: userId,
        name: cat.name + " Professional Demo",
        email: "talent-extra-" + cat.key.toLowerCase() + "@artivo.demo",
        role: "ARTIST",
        demo_role: "ARTIST",
        suspended: 0,
        phone: "",
      });
      const p = {
        ...template,
        user_id: userId,
        stage_name: cat.name + " Professional Demo",
        category_id: db.categories.find((c) => c.talent_key === cat.key).id,
        primary_category: cat.key,
        profile_type: cat.technical ? "TECHNICIAN" : "PERFORMER",
        specialties: [
          { name: specialty?.name || cat.name, category_key: cat.key },
        ],
        skills: a.taxonomy
          .filter((t) => t.parent_id === cat.id && t.kind === "SKILL")
          .map((t) => t.name),
        certifications: cat.sensitive
          ? [
              {
                id: 1,
                name: "Documento de seguridad de muestra",
                issuer: "Demo Safety",
                document: "Pendiente de revisión",
                expiration_date: date(365),
                verification_status: "PENDING",
                demo: true,
              },
            ]
          : [],
        enterprise_ready: !cat.sensitive,
        bio: cat.name + " · Perfil ficticio",
        genres: cat.name,
      };
      db.artists.push(p);
      db.availability.push({
        id: next(db.availability),
        artist_id: userId,
        kind: "AVAILABLE",
        start: date(0) + "T00:00",
        end: date(730) + "T23:59",
      });
      db.posts.unshift({
        id: next(db.posts),
        artist_id: userId,
        caption: cat.name + " · Portfolio de muestra",
        media_type: "VIDEO",
        media_url: "demo-performance.mp4",
        created_at: new Date().toISOString(),
      });
      const o = {
        ...clone(a.opportunities.find((o) => o.category_key === "AUDIO")),
        id: next(a.opportunities),
        title: cat.name + " · Especialista para eventos",
        category: cat.name,
        category_key: cat.key,
        service_id: cat.key + ":service",
        booking_type: cat.technical
          ? "TECHNICAL_BOOKING"
          : "PERFORMANCE_BOOKING",
        requires_certification: cat.sensitive,
        required_skills: p.skills.slice(0, 1),
        requirements: p.skills.join(", ") || "Experiencia profesional",
        call_minutes: cat.technical ? 240 : 60,
        dates: [
          {
            id: 1,
            start: date(300 + index) + "T20:00-04:00",
            end: date(301 + index) + "T00:00-04:00",
            capacity: 1,
          },
        ],
      };
      a.opportunities.push(o);
      for (const past of [true, false]) {
        const e = {
          ...clone(a.events.find((e) => e.category_key === "AUDIO")),
          id: next(a.events),
          opportunity_id: o.id,
          date_id: past ? 0 : 1,
          provider_id: userId,
          performer_id: userId,
          title: o.title,
          category_key: cat.key,
          service_id: o.service_id,
          booking_type: o.booking_type,
          required_skills: o.required_skills,
          requires_certification: o.requires_certification,
          status: past ? "INVOICED" : "CONFIRMED",
          setup: past ? "VERIFIED" : "PENDING",
          start: past ? date(-10) + "T20:00-04:00" : o.dates[0].start,
          end: past ? date(-9) + "T00:00-04:00" : o.dates[0].end,
          evidence: [],
          history: [],
          technical_stage: past ? "STRIKE_COMPLETED" : "PENDING",
        };
        e.booking_id = e.id;
        e.call_time = new Date(
          Date.parse(e.start) - o.call_minutes * 60000,
        ).toISOString();
        e.operational_minutes = 240 + o.call_minutes;
        a.events.push(e);
        if (past) {
          const invoice = {
            ...clone(
              a.invoices.find((i) => i.provider_id === template.user_id),
            ),
            id: next(a.invoices),
            number: "INV-" + (10000 + next(a.invoices)),
            event_id: e.id,
            provider_id: userId,
          };
          a.invoices.push(invoice);
        }
      }
    }
    a.coverage_version = 1;
  }
  function assignments(o) {
    return (o.staffing || []).flatMap((slot) =>
      Array.from({ length: slot.quantity }, (_, i) => ({
        id: slot.id + "-" + (i + 1),
        slot_id: slot.id,
        category_key: slot.category_key,
        label: slot.label,
        skills: slot.skills || [],
        provider_id: null,
        status: "UNASSIGNED",
      })),
    );
  }
  function staffingSummary(db, o) {
    const total =
        o.staffing?.reduce((s, x) => s + x.quantity, 0) * o.dates.length ||
        o.dates.reduce((s, d) => s + d.capacity, 0),
      events = db.arti.events.filter(
        (e) => e.opportunity_id === o.id && e.status !== "CANCELLED",
      ),
      filled = o.staffing
        ? events.reduce(
            (s, e) =>
              s +
              (e.staffing_assignments || []).filter((x) => x.provider_id)
                .length,
            0,
          )
        : events.length,
      held = db.arti.holds.filter(
        (h) => h.opportunity_id === o.id && Date.parse(h.expires) > Date.now(),
      ).length;
    return {
      total,
      filled,
      negotiating:
        held * (o.staffing?.reduce((s, x) => s + x.quantity, 0) || 1),
      available: Math.max(0, total - filled),
      missing: Math.max(0, total - filled),
    };
  }
  function route(db, path, data, u, conflict) {
    const a = db.arti,
      p = path.replace("/api/arti/", "").split("/"),
      admin = (u.demo_role || u.role) === "ADMIN";
    if (p[0] === "taxonomy") {
      if (!admin) throw Error("Solo Admin configura la taxonomía.");
      if (!data) return { nodes: a.taxonomy, kinds: registryKinds };
      const action = p[2] || "create";
      if (action === "create") {
        if (!registryKinds.includes(data.kind))
          throw Error("Tipo de taxonomía inválido.");
        if (!data.name?.trim()) throw Error("Nombre requerido.");
        const parent = data.parent_id ? Number(data.parent_id) : null;
        if (parent && !a.taxonomy.some((x) => x.id === parent))
          throw Error("Padre inexistente.");
        a.taxonomy.push({
          id: next(a.taxonomy),
          key: data.key || "custom-" + next(a.taxonomy),
          name: data.name.trim(),
          kind: data.kind,
          parent_id: parent,
          enabled: true,
          order: a.taxonomy.length,
          technical: !!data.technical,
          sensitive: !!data.sensitive,
        });
      } else {
        const n = a.taxonomy.find((x) => x.id === Number(p[1]));
        if (!n) throw Error("Categoría inexistente.");
        if (action === "edit") {
          if (!data.name?.trim()) throw Error("Nombre requerido.");
          n.name = data.name.trim();
        } else if (action === "disable") n.enabled = data.enabled === true;
        else if (action === "reorder") {
          if (!Number.isInteger(Number(data.order)))
            throw Error("Orden inválido.");
          n.order = Number(data.order);
        } else throw Error("Acción inválida.");
      }
      return { message: "Taxonomía actualizada" };
    }
    if (p[0] === "talent_profile") {
      const profile = db.artists.find((x) => x.user_id === u.id);
      if (!profile) throw Error("Perfil profesional requerido.");
      if (!data) return profile;
      const cat = category(db, data.primary_category);
      if (!cat?.enabled) throw Error("Categoría deshabilitada.");
      if (!types.includes(data.entity_type))
        throw Error("Tipo de profesional inválido.");
      const specialties = (data.specialties || []).map((id) =>
        a.taxonomy.find(
          (t) => t.id === Number(id) && t.kind === "SPECIALTY" && t.enabled,
        ),
      );
      if (specialties.some((s) => !s)) throw Error("Especialidad inválida.");
      const skillIds = (data.skills || []).map((id) =>
        a.taxonomy.find(
          (t) => t.id === Number(id) && t.kind === "SKILL" && t.enabled,
        ),
      );
      if (skillIds.some((s) => !s)) throw Error("Habilidad inválida.");
      const rates = {
        currency: data.currency || "USD",
        custom_quote: !!data.custom_quote,
      };
      if (!["USD", "DOP", "EUR"].includes(rates.currency))
        throw Error("Moneda inválida.");
      for (const k of rateKeys) {
        const n = Number(data.rates?.[k] || 0);
        if (!Number.isSafeInteger(n) || n < 0) throw Error("Tarifa inválida.");
        rates[k] = n;
      }
      Object.assign(profile, {
        primary_category: cat.key,
        entity_type: data.entity_type,
        profile_type:
          data.entity_type !== "INDIVIDUAL"
            ? data.entity_type
            : cat.technical
              ? "TECHNICIAN"
              : cat.key === "DANCE"
                ? "DANCER"
                : cat.key === "MUSIC" || cat.key === "DJ" || cat.key === "VOCAL"
                  ? "MUSICIAN"
                  : "PERFORMER",
        specialties: specialties.map((s) => ({
          name: s.name,
          category_key: a.taxonomy.find((c) => c.id === s.parent_id)?.key,
        })),
        skills: skillIds.map((s) => s.name),
        rates,
        years_experience: Math.max(
          0,
          Math.min(80, Number(data.years_experience || 0)),
        ),
        equipment_mode:
          data.equipment_mode === "HAS_EQUIPMENT"
            ? "HAS_EQUIPMENT"
            : "REQUIRES_EQUIPMENT",
      });
      for (const k of [
        "hardware_experience",
        "software_experience",
        "projects",
        "venues_worked",
        "space_required",
        "safety_requirements",
        "floor_requirements",
        "professional_level",
        "languages",
      ])
        if (data[k] !== undefined) profile[k] = String(data[k]).slice(0, 1500);
      for (const k of [
        "ceiling_height",
        "setup_minutes",
        "teardown_minutes",
        "group_size",
      ])
        if (data[k] !== undefined) {
          const n = Number(data[k]);
          if (!Number.isFinite(n) || n < 0) throw Error("Medida inválida.");
          profile[k] = n;
        }
      return { message: "Perfil profesional y especialidades actualizados" };
    }
    if (p[0] === "certification") {
      const profile = db.artists.find((x) => x.user_id === Number(p[1]));
      if (!profile) throw Error("Perfil inexistente.");
      if (p[2] === "verify") {
        if (!admin) throw Error("Solo Admin revisa documentos.");
        const c = profile.certifications.find((c) => c.id === Number(data.id));
        if (!c) throw Error("Documento inexistente.");
        c.verification_status =
          data.approve === true ? "VERIFIED_DEMO" : "REJECTED";
        c.verified_by = u.id;
        c.verification_date = new Date().toISOString();
        profile.enterprise_ready = profile.certifications.some(
          (c) => c.verification_status === "VERIFIED_DEMO",
        );
      } else {
        if (profile.user_id !== u.id)
          throw Error("No puedes alterar documentos ajenos.");
        if (
          !data.name?.trim() ||
          !data.issuer?.trim() ||
          !data.document?.trim()
        )
          throw Error("Completa nombre, emisor y referencia documental.");
        profile.certifications.push({
          id: next(profile.certifications),
          name: data.name.slice(0, 120),
          issuer: data.issuer.slice(0, 120),
          issue_date: data.issue_date,
          expiration_date: data.expiration_date,
          document: data.document.slice(0, 1500),
          verification_status: "PENDING",
          demo: true,
        });
      }
      return { message: "Documento registrado · verificación demo" };
    }
    if (p[0] === "equipment") {
      if (!data)
        return {
          equipment: a.equipment.filter((e) => admin || e.owner_id === u.id),
        };
      if (!data.model?.trim()) throw Error("Modelo requerido.");
      a.equipment.push({
        id: next(a.equipment),
        owner_id: u.id,
        category: data.category,
        model: data.model.slice(0, 120),
        mode:
          data.mode === "HAS_EQUIPMENT"
            ? "HAS_EQUIPMENT"
            : "REQUIRES_EQUIPMENT",
        demo: true,
      });
      return { message: "Equipo asociado al perfil" };
    }
    if (p[0] === "event" && p[2] === "assign_slot") {
      const e = a.events.find((e) => e.id === Number(p[1]));
      if (
        !e ||
        (!admin && ![e.owner_id, e.provider_id, e.agency_id].includes(u.id))
      )
        throw Error("Solo el coordinador asigna personal.");
      if (["INVOICED", "SETTLED", "DISPUTED"].includes(e.status))
        throw Error("El evento ya está cerrado o en disputa.");
      const slot = e.staffing_assignments.find((x) => x.id === data.slot_id),
        person = db.artists.find((x) => x.user_id === Number(data.provider_id));
      if (!slot || !person || !qualified(person, slot))
        throw Error(
          "Perfil incompatible con categoría, habilidades o certificación requerida.",
        );
      if (
        db.users.find((u) => u.id === person.user_id)?.suspended ||
        conflict(
          db,
          person.user_id,
          e.start,
          e.end,
          e.id,
          0,
          0,
          (Date.parse(e.start) - Date.parse(e.call_time)) / 60000,
        )
      )
        throw Error("Conflicto de disponibilidad.");
      if (
        e.staffing_assignments.some(
          (x) => x.id !== slot.id && x.provider_id === person.user_id,
        )
      )
        throw Error("El profesional ya ocupa otra plaza en este evento.");
      slot.provider_id = person.user_id;
      slot.status = "ASSIGNED";
      e.history.push({
        status: "STAFFING_ASSIGNED",
        by: u.id,
        at: new Date().toISOString(),
        assignment_id: slot.id,
        provider_id: person.user_id,
      });
      return { message: "Profesional asignado a su plaza" };
    }
    if (p[0] === "event" && p[2] === "technical") {
      const e = a.events.find((e) => e.id === Number(p[1]));
      if (!e || (!admin && ![e.provider_id, e.performer_id].includes(u.id)))
        throw Error("Solo el proveedor registra operación técnica.");
      const stages = [
        "LOAD_IN",
        "SETUP_STARTED",
        "SETUP_COMPLETED",
        "SOUNDCHECK",
        "READY",
        "STRIKE_STARTED",
        "STRIKE_COMPLETED",
      ];
      const previous = stages.indexOf(e.technical_stage);
      if (!e.checkin?.inside)
        throw Error("Registra llegada antes de la operación técnica.");
      if (data.stage !== stages[previous + 1])
        throw Error("Avanza en el orden operativo.");
      if (data.stage === "STRIKE_STARTED" && e.status !== "COMPLETED")
        throw Error("Completa el show antes del strike.");
      e.technical_stage = data.stage;
      e.history.push({
        status: data.stage,
        by: u.id,
        at: new Date().toISOString(),
      });
      return { message: "Estado técnico registrado: " + data.stage };
    }
    if (p[0] === "talent_availability") {
      const profile = db.artists.find((x) => x.user_id === u.id);
      if (!profile) throw Error("Perfil profesional requerido.");
      if (
        ![
          "AVAILABLE",
          "TENTATIVE",
          "RESERVED",
          "BOOKED",
          "UNAVAILABLE",
          "TRAVELING",
          "ON_ASSIGNMENT",
          "VACATION",
        ].includes(data.status)
      )
        throw Error("Estado de disponibilidad inválido.");
      if (
        !Number.isFinite(Date.parse(data.start)) ||
        Date.parse(data.end) <= Date.parse(data.start)
      )
        throw Error("Rango inválido.");
      if (
        data.status !== "AVAILABLE" &&
        conflict(db, u.id, data.start, data.end)
      )
        throw Error("Existe un compromiso en ese horario.");
      a.talent_availability ||= [];
      a.talent_availability.push({
        id: next(a.talent_availability),
        user_id: u.id,
        ...data,
      });
      db.availability.push({
        id: next(db.availability),
        artist_id: u.id,
        kind: data.status === "AVAILABLE" ? "AVAILABLE" : "BLOCKED",
        start: data.start.replace(/-04:00$/, ""),
        end: data.end.replace(/-04:00$/, ""),
      });
      return { message: "Disponibilidad profesional actualizada" };
    }
    return null;
  }
  root.ArtiTalent = {
    seed,
    category,
    categoryOptions,
    qualified,
    compatible,
    assignments,
    staffingSummary,
    route,
    groups,
    types,
    rateKeys,
    registryKinds,
  };
  if (typeof module !== "undefined") module.exports = root.ArtiTalent;
})(typeof window !== "undefined" ? window : globalThis);
