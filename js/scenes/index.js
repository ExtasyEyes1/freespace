import {HeroScene} from './HeroScene.js';
import {OpenSpaceScene} from './OpenSpaceScene.js';
import {MeetingScene} from './MeetingScene.js';
import {QuietScene} from './QuietScene.js';
import {KitchenScene} from './KitchenScene.js';
import {PricingScene} from './PricingScene.js';
import {ContactScene} from './ContactScene.js';
export const createScenes = stage => Object.fromEntries([HeroScene,OpenSpaceScene,MeetingScene,QuietScene,KitchenScene,PricingScene,ContactScene].map(Scene=>{const view=new Scene(stage);return [view.id,view];}));

