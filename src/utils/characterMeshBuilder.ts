import * as THREE from 'three';
import {
  CharacterAppearance,
  CharacterAnimationState,
} from '../types/nexus';

export interface CharacterMeshBundle {
  group: THREE.Group;
  bodyMesh: THREE.Mesh;
  headGroup: THREE.Group;
  leftArm: THREE.Mesh;
  rightArm: THREE.Mesh;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  floatingCosmeticsGroup: THREE.Group;
  popcornProp: THREE.Group;
  drinkProp: THREE.Group;
  materials: {
    skin: THREE.MeshStandardMaterial;
    hair: THREE.MeshStandardMaterial;
    hairHighlights?: THREE.MeshStandardMaterial;
    facialHair?: THREE.MeshStandardMaterial;
    eye: THREE.MeshBasicMaterial;
    top: THREE.MeshStandardMaterial;
    pants: THREE.MeshStandardMaterial;
    shoes: THREE.MeshStandardMaterial;
    hat?: THREE.MeshStandardMaterial;
    accessory: THREE.MeshStandardMaterial;
  };
}

/**
 * Creates a fully articulated 3D Three.js character model group based on CharacterAppearance.
 * Shared between Character Studio 3D Canvas, 3D Preview modal, and 3D Cinema multiplayer room.
 */
export function buildCharacterMeshGroup(
  appearance: CharacterAppearance,
  participantUid: string = 'local-preview'
): CharacterMeshBundle {
  const group = new THREE.Group();
  group.userData = { participantUid };

  const isFemale = appearance.gender === 'female';
  const skinColor = appearance.skinTone || (isFemale ? '#FCD34D' : '#F59E0B');
  const hairColor = appearance.hairColor || '#1E1B4B';
  const hairHighlightsColor = appearance.hairHighlights || hairColor;
  const facialHairColor = appearance.facialHairColor || hairColor;
  const eyeColor = appearance.eyeColor || '#0F172A';
  const topColor = appearance.topColor || appearance.primaryColor || '#3B82F6';
  const pantsColor = appearance.pantsColor || appearance.secondaryColor || '#1E293B';
  const shoesColor = appearance.shoesColor || '#0F172A';
  const hatColor = appearance.hatColor || '#38BDF8';
  const accessoryColor = appearance.accessoryColor || '#F59E0B';

  // Material property variations based on materialFinish
  const finish = appearance.materialFinish || 'cotton';
  let topRoughness = 0.55;
  let topMetalness = 0.05;
  if (finish === 'denim') {
    topRoughness = 0.75;
  } else if (finish === 'leather') {
    topRoughness = 0.3;
    topMetalness = 0.25;
  } else if (finish === 'wool') {
    topRoughness = 0.85;
  } else if (finish === 'metallic') {
    topRoughness = 0.2;
    topMetalness = 0.85;
  } else if (finish === 'glossy') {
    topRoughness = 0.15;
    topMetalness = 0.35;
  } else if (finish === 'matte') {
    topRoughness = 0.95;
  }

  const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.55 });
  const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.4 });
  const hairHighlightsMat = new THREE.MeshStandardMaterial({ color: hairHighlightsColor, roughness: 0.35 });
  const facialHairMat = new THREE.MeshStandardMaterial({ color: facialHairColor, roughness: 0.45 });
  const eyeMat = new THREE.MeshBasicMaterial({ color: eyeColor });
  const topMat = new THREE.MeshStandardMaterial({ color: topColor, roughness: topRoughness, metalness: topMetalness });
  const pantsMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.65 });
  const shoesMat = new THREE.MeshStandardMaterial({ color: shoesColor, roughness: 0.35, metalness: 0.2 });
  const hatMat = new THREE.MeshStandardMaterial({ color: hatColor, roughness: 0.45 });
  const accessoryMat = new THREE.MeshStandardMaterial({ color: accessoryColor, metalness: 0.8, roughness: 0.2 });

  // Body Proportions
  const shoulderWidth = isFemale ? 0.48 : 0.58;
  const torsoHeight = isFemale ? 0.68 : 0.74;
  const headRadius = isFemale ? 0.22 : 0.24;

  // Sole & Accents for shoes
  const soleMat = new THREE.MeshStandardMaterial({ color: '#F8FAFC', roughness: 0.25 });
  const footwear = appearance.footwear || 'sneakers_fresh';
  const isBoots = footwear === 'boots_leather';
  const isSlippers = footwear === 'slippers_funny';

  // Left Leg & Shoe
  const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.62, 0.20), pantsMat);
  leftLeg.position.set(-0.15, 0.31, 0);
  leftLeg.castShadow = true;
  leftLeg.userData = { participantUid };

  const leftShoeBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.20, isBoots ? 0.22 : 0.12, isSlippers ? 0.34 : 0.28),
    isSlippers ? new THREE.MeshStandardMaterial({ color: '#EC4899', roughness: 0.8 }) : shoesMat
  );
  leftShoeBody.position.set(0, isBoots ? -0.20 : -0.25, -0.04);
  const leftShoeSole = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.04, 0.30), soleMat);
  leftShoeSole.position.set(0, -0.31, -0.04);
  leftLeg.add(leftShoeBody, leftShoeSole);

  // Right Leg & Shoe
  const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.62, 0.20), pantsMat);
  rightLeg.position.set(0.15, 0.31, 0);
  rightLeg.castShadow = true;
  rightLeg.userData = { participantUid };

  const rightShoeBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.20, isBoots ? 0.22 : 0.12, isSlippers ? 0.34 : 0.28),
    isSlippers ? new THREE.MeshStandardMaterial({ color: '#EC4899', roughness: 0.8 }) : shoesMat
  );
  rightShoeBody.position.set(0, isBoots ? -0.20 : -0.25, -0.04);
  const rightShoeSole = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.04, 0.30), soleMat);
  rightShoeSole.position.set(0, -0.31, -0.04);
  rightLeg.add(rightShoeBody, rightShoeSole);

  group.add(leftLeg, rightLeg);

  // Torso / Upper Body
  const upperBody = appearance.upperBody || 'tee_casual';
  const isHoodie = upperBody === 'hoodie_street' || appearance.outfit === 'hoodie_denim' || appearance.outfit === 'cyber_hoodie';
  const isJacket = upperBody === 'leather_jacket' || upperBody === 'suit_jacket' || appearance.outfit === 'neon_jacket';

  const bodyMesh = new THREE.Mesh(
    new THREE.BoxGeometry(shoulderWidth, torsoHeight, isHoodie ? 0.38 : 0.34),
    topMat
  );
  bodyMesh.position.set(0, 0.96, 0);
  bodyMesh.castShadow = true;
  bodyMesh.userData = { participantUid };

  // Belt & Buckle
  const beltMat = new THREE.MeshStandardMaterial({ color: '#090D16', roughness: 0.3 });
  const beltBuckleMat = new THREE.MeshStandardMaterial({ color: '#E2E8F0', metalness: 0.8, roughness: 0.2 });
  const belt = new THREE.Mesh(new THREE.BoxGeometry(shoulderWidth + 0.02, 0.06, 0.36), beltMat);
  belt.position.set(0, -torsoHeight / 2 + 0.03, 0);
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.04), beltBuckleMat);
  buckle.position.set(0, -torsoHeight / 2 + 0.03, -0.19);
  bodyMesh.add(belt, buckle);

  if (isJacket) {
    const lapelLeft = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.32, 0.04), accessoryMat);
    lapelLeft.position.set(-0.14, 0.12, -0.18);
    const lapelRight = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.32, 0.04), accessoryMat);
    lapelRight.position.set(0.14, 0.12, -0.18);
    bodyMesh.add(lapelLeft, lapelRight);
  }

  group.add(bodyMesh);

  // Arms (Left & Right)
  const armRadius = isFemale ? 0.085 : 0.095;
  const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(armRadius, armRadius * 0.85, 0.64, 16), topMat);
  leftArm.position.set(-shoulderWidth / 2 - 0.10, 0.96, 0);
  leftArm.castShadow = true;
  leftArm.userData = { participantUid };
  const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), skinMat);
  leftHand.position.set(0, -0.34, 0);
  leftArm.add(leftHand);

  const rightArm = new THREE.Mesh(new THREE.CylinderGeometry(armRadius, armRadius * 0.85, 0.64, 16), topMat);
  rightArm.position.set(shoulderWidth / 2 + 0.10, 0.96, 0);
  rightArm.castShadow = true;
  rightArm.userData = { participantUid };
  const rightHand = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), skinMat);
  rightHand.position.set(0, -0.34, 0);
  rightArm.add(rightHand);

  group.add(leftArm, rightArm);

  // Head Group
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.56, 0);

  // Neck
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.14, 12), skinMat);
  neck.position.set(0, -0.16, 0);
  headGroup.add(neck);

  // Main Head Mesh
  const headMesh = new THREE.Mesh(new THREE.SphereGeometry(headRadius, 24, 24), skinMat);
  headMesh.userData = { participantUid };
  headGroup.add(headMesh);

  // Ears (Standard or Oversized for Funny Cosmetic)
  const isOversizedEars = appearance.funnyCosmetic === 'oversized_ears';
  const earScale = isOversizedEars ? 2.2 : 1.0;
  const leftEar = new THREE.Mesh(new THREE.TorusGeometry(0.042 * earScale, 0.014 * earScale, 8, 16, Math.PI), skinMat);
  leftEar.rotation.y = -Math.PI / 2;
  leftEar.position.set(-headRadius * 0.98 * (isOversizedEars ? 1.1 : 1.0), 0.01, 0);
  const rightEar = new THREE.Mesh(new THREE.TorusGeometry(0.042 * earScale, 0.014 * earScale, 8, 16, Math.PI), skinMat);
  rightEar.rotation.y = Math.PI / 2;
  rightEar.position.set(headRadius * 0.98 * (isOversizedEars ? 1.1 : 1.0), 0.01, 0);
  headGroup.add(leftEar, rightEar);

  // Nose (Standard or Clown Nose for Funny Cosmetic)
  const isClownNose = appearance.funnyCosmetic === 'clown_nose';
  if (isClownNose) {
    const clownNoseMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 16, 16),
      new THREE.MeshStandardMaterial({ color: '#EF4444', roughness: 0.2, metalness: 0.1 })
    );
    clownNoseMesh.position.set(0, 0.01, -headRadius * 1.08);
    headGroup.add(clownNoseMesh);
  } else {
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.07, 8), skinMat);
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, 0.01, -headRadius * 0.98);
    headGroup.add(nose);
  }

  // Mouth / Lips / Cartoon Teeth
  const isCartoonTeeth = appearance.funnyCosmetic === 'cartoon_teeth';
  if (isCartoonTeeth) {
    const teethMat = new THREE.MeshBasicMaterial({ color: '#FFFFFF' });
    const teethBar = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.03), teethMat);
    teethBar.position.set(0, -0.07, -headRadius * 0.96);
    headGroup.add(teethBar);
  } else {
    const lipMat = new THREE.MeshStandardMaterial({
      color: isFemale ? '#F43F5E' : '#D97706',
      roughness: 0.6,
    });
    const lips = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.02), lipMat);
    lips.position.set(0, -0.07, -headRadius * 0.95);
    headGroup.add(lips);
  }

  // Eyes (Facing -Z)
  const eyeR = 0.035;
  const eyeSpacing = isFemale ? 0.08 : 0.088;
  const scleraMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
  const highlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

  [-eyeSpacing, eyeSpacing].forEach((xEye) => {
    const eyeBase = new THREE.Mesh(new THREE.SphereGeometry(eyeR, 12, 12), scleraMat);
    eyeBase.position.set(xEye, 0.03, -headRadius * 0.88);

    const iris = new THREE.Mesh(new THREE.SphereGeometry(eyeR * 0.58, 10, 10), eyeMat);
    iris.position.set(0, 0, -eyeR * 0.6);

    const pupil = new THREE.Mesh(new THREE.SphereGeometry(eyeR * 0.32, 8, 8), pupilMat);
    pupil.position.set(0, 0, -eyeR * 0.75);

    const glint = new THREE.Mesh(new THREE.SphereGeometry(eyeR * 0.18, 6, 6), highlightMat);
    glint.position.set(eyeR * 0.18, eyeR * 0.18, -eyeR * 0.85);

    eyeBase.add(iris, pupil, glint);
    headGroup.add(eyeBase);
  });

  if (isFemale) {
    const lashMat = new THREE.MeshBasicMaterial({ color: 0x18181b });
    const leftLash = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.012, 0.04), lashMat);
    leftLash.position.set(-eyeSpacing, 0.068, -headRadius * 0.89);
    const rightLash = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.012, 0.04), lashMat);
    rightLash.position.set(eyeSpacing, 0.068, -headRadius * 0.89);
    headGroup.add(leftLash, rightLash);
  }

  // HAIRSTYLES
  const hairStyle = appearance.hairStyle;
  if (hairStyle === 'bun_classic' || (isFemale && hairStyle === 'long_flowing')) {
    const mainHair = new THREE.Mesh(
      new THREE.SphereGeometry(headRadius * 1.05, 18, 18, 0, Math.PI * 2, 0, Math.PI * 0.65),
      hairMat
    );
    mainHair.position.set(0, 0.02, 0.02);
    headGroup.add(mainHair);

    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 14), hairMat);
    bun.position.set(0, headRadius + 0.06, 0.08);
    headGroup.add(bun);

    if (isFemale) {
      const leftStrand = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.02, 0.32, 8), hairHighlightsMat);
      leftStrand.position.set(-headRadius * 0.9, -0.08, -0.04);
      const rightStrand = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.02, 0.32, 8), hairHighlightsMat);
      rightStrand.position.set(headRadius * 0.9, -0.08, -0.04);
      headGroup.add(leftStrand, rightStrand);
    }
  } else if (hairStyle === 'spiky' || hairStyle === 'cyber_undercut' || hairStyle === 'mohawk') {
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(headRadius * 1.05, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.5),
      hairMat
    );
    cap.position.set(0, 0.04, 0);
    headGroup.add(cap);

    const isMohawk = hairStyle === 'mohawk';
    const spikeCount = isMohawk ? 7 : 5;
    for (let i = 0; i < spikeCount; i++) {
      const spike = new THREE.Mesh(
        new THREE.ConeGeometry(isMohawk ? 0.04 : 0.05, isMohawk ? 0.22 : 0.16, 8),
        i % 2 === 0 ? hairMat : hairHighlightsMat
      );
      const offset = (i - Math.floor(spikeCount / 2)) * 0.05;
      if (isMohawk) {
        spike.position.set(0, headRadius + 0.08, offset);
      } else {
        spike.position.set(offset, headRadius + 0.08, 0.02 - Math.abs(offset) * 0.02);
        spike.rotation.z = -offset * 2.5;
      }
      headGroup.add(spike);
    }
  } else if (hairStyle === 'afro') {
    const afro = new THREE.Mesh(new THREE.SphereGeometry(headRadius * 1.35, 20, 20), hairMat);
    afro.position.set(0, 0.06, 0);
    headGroup.add(afro);
  } else if (hairStyle === 'braids' || hairStyle === 'ponytail') {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(headRadius * 1.05, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat);
    cap.position.set(0, 0.03, 0.01);
    headGroup.add(cap);

    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.03, 0.40, 10), hairHighlightsMat);
    tail.rotation.x = 0.4;
    tail.position.set(0, 0.02, headRadius + 0.12);
    headGroup.add(tail);
  } else {
    // Default short crop
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(headRadius * 1.05, 18, 18, 0, Math.PI * 2, 0, Math.PI * 0.6),
      hairMat
    );
    cap.position.set(0, 0.03, 0.01);
    headGroup.add(cap);
  }

  // FACIAL HAIR & MOUSTACHES
  const facialHair = appearance.facialHair || 'clean_shaven';
  const isGiantMoustache = appearance.funnyCosmetic === 'moustaches_giant' || facialHair === 'oversized_moustache';

  if (isGiantMoustache) {
    // Giant Cartoon Curled Moustache
    const stacheGroup = new THREE.Group();
    stacheGroup.position.set(0, -0.04, -headRadius * 1.02);

    const center = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 12), facialHairMat);
    center.rotation.z = Math.PI / 2;

    const leftWing = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.04, 8, 16, Math.PI * 0.8), facialHairMat);
    leftWing.position.set(-0.20, 0.04, 0);
    leftWing.rotation.z = 0.3;

    const rightWing = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.04, 8, 16, Math.PI * 0.8), facialHairMat);
    rightWing.position.set(0.20, 0.04, 0);
    rightWing.rotation.z = -0.3;

    stacheGroup.add(center, leftWing, rightWing);
    headGroup.add(stacheGroup);
  } else if (facialHair === 'handlebar_moustache' || facialHair === 'curled_moustache' || facialHair === 'long_moustache') {
    const stache = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 0.04), facialHairMat);
    stache.position.set(0, -0.045, -headRadius * 0.98);
    headGroup.add(stache);
  } else if (facialHair === 'full_beard' || facialHair === 'short_beard' || facialHair === 'wizard_beard') {
    const isWizard = facialHair === 'wizard_beard';
    const beardHeight = isWizard ? 0.45 : 0.22;
    const beard = new THREE.Mesh(
      new THREE.CylinderGeometry(headRadius * 0.95, isWizard ? 0.04 : headRadius * 0.8, beardHeight, 16),
      facialHairMat
    );
    beard.position.set(0, isWizard ? -headRadius - 0.12 : -0.10, -0.02);
    headGroup.add(beard);
  } else if (facialHair === 'goatee' || facialHair === 'stubble') {
    const stubble = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.03), facialHairMat);
    stubble.position.set(0, -0.08, -headRadius * 0.96);
    headGroup.add(stubble);
  }

  // HEADWEAR
  const headwear = appearance.headwear || 'none';
  if (headwear === 'tiny_hat') {
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.14, 16), hatMat);
    hat.position.set(0.08, headRadius + 0.12, 0);
    hat.rotation.z = -0.2;
    headGroup.add(hat);
  } else if (headwear === 'giant_top_hat' || headwear === 'top_hat') {
    const isGiant = headwear === 'giant_top_hat';
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(isGiant ? 0.38 : 0.30, isGiant ? 0.38 : 0.30, 0.03, 24), hatMat);
    brim.position.set(0, headRadius + 0.04, 0);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(isGiant ? 0.28 : 0.22, isGiant ? 0.26 : 0.20, isGiant ? 0.45 : 0.30, 24), hatMat);
    crown.position.set(0, headRadius + (isGiant ? 0.26 : 0.18), 0);
    headGroup.add(brim, crown);
  } else if (headwear === 'cowboy_hat') {
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.03, 24), hatMat);
    brim.position.set(0, headRadius + 0.04, 0);
    brim.rotation.x = -0.1;
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.22, 0.22, 24), hatMat);
    crown.position.set(0, headRadius + 0.14, 0);
    headGroup.add(brim, crown);
  } else if (headwear === 'cap_baseball') {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(headRadius * 1.08, 18, 18, 0, Math.PI * 2, 0, Math.PI * 0.5), hatMat);
    cap.position.set(0, 0.04, 0);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.02, 0.16), hatMat);
    visor.position.set(0, 0.04, -headRadius * 1.15);
    headGroup.add(cap, visor);
  } else if (headwear === 'crown_royal') {
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.22, 0.16, 8), accessoryMat);
    crown.position.set(0, headRadius + 0.10, 0);
    headGroup.add(crown);
  }

  // ACCESSORIES & GLASSES
  const accessory = appearance.accessory;
  const funny = appearance.funnyCosmetic;
  const isGlassesOnHead = funny === 'glasses_on_head';

  if (isGlassesOnHead) {
    // Spectacles sitting on TOP of the head!
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.09, 0.06), accessoryMat);
    frame.position.set(0, headRadius + 0.05, 0);
    frame.rotation.x = -0.4;
    headGroup.add(frame);
  } else if (accessory === '3d_glasses') {
    const frameMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.09, 0.06), frameMat);
    frame.position.set(0, 0.035, -headRadius * 0.95);

    const leftLens = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.06), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    leftLens.position.set(-0.09, 0.035, -headRadius * 0.985);
    leftLens.rotation.y = Math.PI;

    const rightLens = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.06), new THREE.MeshBasicMaterial({ color: 0x06b6d4 }));
    rightLens.position.set(0.09, 0.035, -headRadius * 0.985);
    rightLens.rotation.y = Math.PI;

    headGroup.add(frame, leftLens, rightLens);
  } else if (accessory === 'visor' || accessory === 'cyber_visor') {
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.10, 0.12), new THREE.MeshBasicMaterial({ color: 0x22d3ee }));
    visor.position.set(0, 0.04, -headRadius * 0.96);
    headGroup.add(visor);
  } else if (accessory === 'gold_headset' || funny === 'oversized_headphones') {
    const earMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.8, roughness: 0.2 });
    const leftEar = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.06, 12), earMat);
    leftEar.rotation.z = Math.PI / 2;
    leftEar.position.set(-headRadius * 1.06, 0.02, 0);

    const rightEar = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.06, 12), earMat);
    rightEar.rotation.z = Math.PI / 2;
    rightEar.position.set(headRadius * 1.06, 0.02, 0);

    const band = new THREE.Mesh(new THREE.TorusGeometry(headRadius * 1.04, 0.02, 8, 16, Math.PI), earMat);
    band.position.set(0, 0.04, 0);
    headGroup.add(leftEar, rightEar, band);
  } else if (funny === 'monocle') {
    const monocleMat = new THREE.MeshStandardMaterial({ color: '#F59E0B', metalness: 0.9, roughness: 0.1 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.008, 8, 16), monocleMat);
    ring.position.set(eyeSpacing, 0.03, -headRadius * 0.94);
    headGroup.add(ring);
  }

  group.add(headGroup);

  // FLOATING UNUSUAL COSMETICS (Halo, Crown, Stars, Antennas)
  const floatingCosmeticsGroup = new THREE.Group();
  floatingCosmeticsGroup.position.set(0, 1.56 + headRadius + 0.22, 0);

  if (funny === 'floating_halo') {
    const haloMat = new THREE.MeshBasicMaterial({ color: '#FDE047' });
    const haloRing = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.025, 12, 24), haloMat);
    haloRing.rotation.x = Math.PI / 2;
    floatingCosmeticsGroup.add(haloRing);
  } else if (funny === 'floating_crown') {
    const crownMat = new THREE.MeshStandardMaterial({ color: '#F59E0B', metalness: 0.9, roughness: 0.1 });
    const tinyCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.12, 6), crownMat);
    floatingCosmeticsGroup.add(tinyCrown);
  } else if (funny === 'floating_stars') {
    const starMat = new THREE.MeshBasicMaterial({ color: '#38BDF8' });
    for (let i = 0; i < 3; i++) {
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.06), starMat);
      const angle = (i * Math.PI * 2) / 3;
      star.position.set(Math.cos(angle) * 0.28, 0, Math.sin(angle) * 0.28);
      floatingCosmeticsGroup.add(star);
    }
  } else if (funny === 'novelty_antennas') {
    const antMat = new THREE.MeshStandardMaterial({ color: '#10B981', roughness: 0.3 });
    [-0.10, 0.10].forEach((xPos) => {
      const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 8), antMat);
      stalk.position.set(xPos, 0, 0);
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 12), new THREE.MeshBasicMaterial({ color: '#A855F7' }));
      orb.position.set(xPos, 0.12, 0);
      floatingCosmeticsGroup.add(stalk, orb);
    });
  }

  group.add(floatingCosmeticsGroup);

  // Refreshment Props for 3D Cinema interaction (Popcorn bucket & Soda drink)
  const popcornProp = new THREE.Group();
  popcornProp.visible = false;
  const bucketMat = new THREE.MeshStandardMaterial({ color: '#EF4444', roughness: 0.3 });
  const cornMat = new THREE.MeshStandardMaterial({ color: '#FDE047', roughness: 0.8 });
  const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.10, 0.26, 16), bucketMat);
  const cornTop = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 12), cornMat);
  cornTop.position.set(0, 0.12, 0);
  popcornProp.add(bucket, cornTop);
  leftHand.add(popcornProp);

  const drinkProp = new THREE.Group();
  drinkProp.visible = false;
  const cupMat = new THREE.MeshStandardMaterial({ color: '#2563EB', roughness: 0.3 });
  const lidMat = new THREE.MeshStandardMaterial({ color: '#F8FAFC', roughness: 0.2 });
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.08, 0.24, 16), cupMat);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.04, 16), lidMat);
  lid.position.set(0, 0.12, 0);
  const straw = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.16, 8), bucketMat);
  straw.position.set(0.02, 0.18, 0);
  straw.rotation.z = -0.2;
  drinkProp.add(cup, lid, straw);
  rightHand.add(drinkProp);

  return {
    group,
    bodyMesh,
    headGroup,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    floatingCosmeticsGroup,
    popcornProp,
    drinkProp,
    materials: {
      skin: skinMat,
      hair: hairMat,
      hairHighlights: hairHighlightsMat,
      facialHair: facialHairMat,
      eye: eyeMat,
      top: topMat,
      pants: pantsMat,
      shoes: shoesMat,
      hat: hatMat,
      accessory: accessoryMat,
    },
  };
}

/**
 * Procedurally animate avatar limbs and props based on current state & frame time.
 */
export function animateCharacterFrame(
  bundle: CharacterMeshBundle,
  animState: CharacterAnimationState | string,
  timeSeconds: number
): void {
  const { leftArm, rightArm, leftLeg, rightLeg, headGroup, floatingCosmeticsGroup, popcornProp, drinkProp } = bundle;

  // Animate floating items (halo wobble / crown spin / stars orbit)
  if (floatingCosmeticsGroup && floatingCosmeticsGroup.children.length > 0) {
    floatingCosmeticsGroup.rotation.y = timeSeconds * 0.8;
    floatingCosmeticsGroup.position.y = 1.56 + 0.24 + Math.sin(timeSeconds * 2.5) * 0.03;
  }

  // Handle prop visibility
  const isPopcorn = animState === 'holding_popcorn' || animState === 'eating_popcorn';
  const isDrink = animState === 'holding_drink' || animState === 'drinking';
  if (popcornProp) popcornProp.visible = isPopcorn;
  if (drinkProp) drinkProp.visible = isDrink;

  // Reset default limb rotations before applying state blend
  leftLeg.rotation.set(0, 0, 0);
  rightLeg.rotation.set(0, 0, 0);
  leftArm.rotation.set(0, 0, 0);
  rightArm.rotation.set(0, 0, 0);
  headGroup.rotation.set(0, 0, 0);

  if (animState === 'walking') {
    const swing = Math.sin(timeSeconds * 7) * 0.55;
    leftLeg.rotation.x = swing;
    rightLeg.rotation.x = -swing;
    leftArm.rotation.x = -swing * 0.8;
    rightArm.rotation.x = swing * 0.8;
  } else if (animState === 'running') {
    const swing = Math.sin(timeSeconds * 12) * 0.85;
    leftLeg.rotation.x = swing;
    rightLeg.rotation.x = -swing;
    leftArm.rotation.x = -swing * 1.1;
    rightArm.rotation.x = swing * 1.1;
  } else if (animState === 'jumping') {
    leftLeg.rotation.x = -0.4;
    rightLeg.rotation.x = -0.4;
    leftArm.rotation.z = 0.8;
    rightArm.rotation.z = -0.8;
  } else if (animState === 'sitting') {
    leftLeg.rotation.x = -Math.PI / 2.2;
    rightLeg.rotation.x = -Math.PI / 2.2;
    leftArm.rotation.x = -0.2;
    rightArm.rotation.x = -0.2;
  } else if (animState === 'wave' || animState === 'greeting') {
    rightArm.rotation.z = -2.2 + Math.sin(timeSeconds * 10) * 0.35;
    rightArm.rotation.x = -0.2;
  } else if (animState === 'eating_popcorn') {
    leftArm.rotation.x = -0.6; // Hold bucket in front
    rightArm.rotation.x = -1.8 + Math.sin(timeSeconds * 6) * 0.2; // Move hand to mouth
  } else if (animState === 'drinking') {
    rightArm.rotation.x = -1.9 + Math.sin(timeSeconds * 4) * 0.15; // Move straw to mouth
  } else if (animState === 'laughing') {
    const bounce = Math.sin(timeSeconds * 14) * 0.12;
    headGroup.rotation.x = -0.2 + bounce;
    leftArm.rotation.z = 0.3;
    rightArm.rotation.z = -0.3;
  } else if (animState === 'celebrating') {
    leftArm.rotation.z = 2.4 + Math.sin(timeSeconds * 8) * 0.2;
    rightArm.rotation.z = -2.4 - Math.sin(timeSeconds * 8) * 0.2;
  } else {
    // Standard idle breath sway
    const breath = Math.sin(timeSeconds * 2.5) * 0.04;
    leftArm.rotation.z = 0.08 + breath;
    rightArm.rotation.z = -0.08 - breath;
    headGroup.rotation.y = Math.sin(timeSeconds * 1.2) * 0.05;
  }
}
