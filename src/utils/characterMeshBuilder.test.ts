import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCharacterMeshGroup, animateCharacterFrame } from './characterMeshBuilder';
import { CharacterAppearance } from '../types/nexus';

test('characterMeshBuilder: Male & Female 3D Character Generation', () => {
  const maleApp: CharacterAppearance = {
    gender: 'male',
    style: 'modern_casual',
    hairStyle: 'spiky',
    outfit: 'hoodie_denim',
    primaryColor: '#3B82F6',
    secondaryColor: '#1E293B',
    accessory: '3d_glasses',
    displayName: 'Male Tester',
    funnyCosmetic: 'glasses_on_head',
  };

  const maleBundle = buildCharacterMeshGroup(maleApp, 'test-male');
  assert.ok(maleBundle.group, 'Group should be instantiated');
  assert.ok(maleBundle.headGroup, 'Head group should exist');
  assert.equal(maleBundle.group.userData.participantUid, 'test-male');

  const femaleApp: CharacterAppearance = {
    gender: 'female',
    style: 'classic_cinema',
    hairStyle: 'bun_classic',
    outfit: 'vip_blazer',
    primaryColor: '#EC4899',
    secondaryColor: '#0F172A',
    accessory: 'gold_headset',
    displayName: 'Female Tester',
    funnyCosmetic: 'floating_halo',
  };

  const femaleBundle = buildCharacterMeshGroup(femaleApp, 'test-female');
  assert.ok(femaleBundle.group, 'Female group should be created');
  assert.ok(femaleBundle.floatingCosmeticsGroup, 'Floating cosmetics group should exist for halo');
});

test('characterMeshBuilder: Animation Frame Pose Updater', () => {
  const app: CharacterAppearance = {
    gender: 'male',
    style: 'modern_casual',
    hairStyle: 'short_crop',
    outfit: 'casual_denim',
    primaryColor: '#3B82F6',
    secondaryColor: '#1E293B',
    accessory: 'none',
    displayName: 'Anim Tester',
  };

  const bundle = buildCharacterMeshGroup(app, 'test-anim');

  // Test walking animation rotation delta
  animateCharacterFrame(bundle, 'walking', 1.0);
  assert.notEqual(bundle.leftLeg.rotation.x, 0, 'Left leg should rotate during walking');

  // Test celebrating pose
  animateCharacterFrame(bundle, 'celebrating', 2.0);
  assert.notEqual(bundle.leftArm.rotation.z, 0, 'Left arm raised during celebrating');
});
