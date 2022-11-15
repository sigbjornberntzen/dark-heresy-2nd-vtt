import {
    calculateCombatActionModifier,
    combatActions,
    updateAvailableCombatActions,
} from '../rules/combat-actions.mjs';
import { recursiveUpdate } from '../rolls/roll-helpers.mjs';
import { performRollAndSendToChat } from '../rolls/roll-manager.mjs';
import { calculateRange, calculateWeaponRange } from '../rules/range.mjs';
import { WeaponAttackData } from '../actions/weapon-attack-data.mjs';

export class WeaponAttackDialog extends FormApplication {
    constructor(weaponRollData = {}, options = {}) {
        super(weaponRollData, options);
        this.data = weaponRollData;
        this.initialized = false;
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            title: 'Weapon Attack',
            id: 'dh-weapon-attack-dialog',
            template: 'systems/dark-heresy-2nd/templates/prompt/weapon-roll-prompt.hbs',
            width: 500,
            closeOnSubmit: false,
            submitOnChange: true,
            classes: ['dialog'],
        });
    }

    activateListeners(html) {
        super.activateListeners(html);
        html.find('.weapon-select').change(async (ev) => await this._updateWeapon(ev));
        html.find('#attack-roll').click(async (ev) => await this._rollAttack(ev));
        html.find('#attack-cancel').click(async (ev) => await this._cancelAttack(ev));
    }

    async _updateWeapon(event) {
        this.data.selectWeapon(event.target.name);
        this.data.update();
        this.render(true);
    }

    async getData() {
        // Initial Values
        if (!this.initialized) {
            this.data.initialize();
            this.initialized = true;
        }
        this.data.update();
        return this.data;
    }

    async _updateObject(event, formData) {
        recursiveUpdate(this.data, formData);
        this.render(true);
    }

    async _cancelAttack(event) {
        await this.close();
    }

    async _rollAttack(event) {
        await this.data.finalize();
        const attackData = new WeaponAttackData();
        attackData.rollData = this.data;
        await performRollAndSendToChat(attackData);
        await this.close();
    }
}

export async function prepareWeaponRoll(weaponRollData) {
    const prompt = new WeaponAttackDialog(weaponRollData);
    prompt.render(true);
}
