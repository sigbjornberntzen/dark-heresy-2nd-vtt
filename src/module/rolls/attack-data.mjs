import { PsychicRollData, WeaponRollData } from './roll-data.mjs';
import { Hit, PsychicDamageData, WeaponDamageData } from './damage-data.mjs';
import { getDegree, roll1d100, uuid } from './roll-helpers.mjs';

export class AttackData {
    id = uuid();
    template = ''
    hasDamage = false;
    rollData;
    damageData;
    effects = [];

    async _calculateHit() {
        this.rollData.roll = await roll1d100();
        let rollTotal = this.rollData.roll.total;
        const target = this.rollData.modifiedTarget;
        this.rollData.success = rollTotal === 1 || (rollTotal <= target && rollTotal !== 100);
    }

    async calculateSuccessOrFailure() {
        await this._calculateHit();
        let actionItem = this.rollData.weapon ?? this.rollData.power;
        if (!actionItem) return;

        if (actionItem.isMelee) {
            if (!this.rollData.success) {
                // Re-Roll Attack for Blademaster
                if (this.rollData.sourceActor.hasTalent('Blademaster')) {
                    this.effects.push('blademaster');
                    this.rollData.previousRolls.push(this.rollData.roll);
                    await this._calculateHit();
                }
            }
        } else if (actionItem.isRanged) {
            const rollTotal = this.rollData.roll.total;
            if (rollTotal > 91 && this.rollData.hasAttackSpecial('Overheats')) {
                this.effects.push('overheat');
            }
            if ((!this.rollData.hasAttackSpecial('Reliable') && rollTotal > 96) || rollTotal === 100) {
                this.effects.push('jam');
            }
        }

        if (this.rollData.success) {
            this.rollData.dof = 0;
            this.rollData.dos = 1 + getDegree(this.rollData.modifiedTarget, this.rollData.roll.total);

            if (this.rollData.action === 'Semi-Auto Burst' || this.rollData.action === 'Swift Attack' || actionItem.isPsychicBarrage) {
                // Possible Semi Rate
                this.damageData.additionalHits += Math.floor((this.rollData.dos - 1) / 2);

                // Storm
                if (this.rollData.hasAttackSpecial('Storm')) {
                    this.damageData.additionalHits *= 2;
                }

                // But Max at fire rate (Ammo available / ammo per shot || rate of fire - whichever is lower)
                if (actionItem.isRanged && this.damageData.additionalHits > this.rollData.fireRate - 1) {
                    this.damageData.additionalHits = this.rollData.fireRate - 1;
                }
            } else if (this.rollData.action === 'Full Auto Burst' || this.rollData.action === 'Lightning Attack' || actionItem.isPsychicStorm) {
                // Possible Full Rate
                this.damageData.additionalHits += Math.floor(this.rollData.dos - 1);

                // Storm
                if (this.rollData.hasAttackSpecial('Storm')) {
                    this.damageData.additionalHits *= 2;
                }

                // But Max at weapon rate
                if (actionItem.isRanged && this.damageData.additionalHits > this.rollData.fireRate - 1) {
                    this.damageData.additionalHits = this.rollData.fireRate - 1;
                }
            }

            if (this.rollData.dos > 1 && this.rollData.hasAttackSpecial('Twin-Linked')) {
                this.damageData.additionalHits++;
            }
        } else {
            this.rollData.dos = 0;
            this.rollData.dof = 1 + getDegree(this.rollData.roll.total, this.rollData.modifiedTarget);

            if (this.rollData.roll.total === 100) {
                this.effects.push('Automatic Failure');
            }
        }
    }

    async calculateHits() {
        let lastLocation = '';
        if(this.rollData.success) {
            let hit = await Hit.createHit(this);
            lastLocation = hit.location;
            this.damageData.hits.push(hit);

            for(let i = 0; i< this.damageData.additionalHits; i++) {
                hit = await Hit.createHit(this, lastLocation);
                lastLocation = hit.location;
                this.damageData.hits.push(hit);
            }
        }
    }
}

export class WeaponAttackData extends AttackData {
    constructor() {
        super();
        this.rollData = new WeaponRollData();
        this.damageData = new WeaponDamageData();
    }
}

export class PsychicAttackData extends AttackData {
    constructor() {
        super();
        this.rollData = new PsychicRollData();
        this.damageData = new PsychicDamageData();
    }
}
