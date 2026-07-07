<template>
    <section class="option-node" :class="{ 'option-node-root': level <= 2 }">
        <component :is="`h${Math.min(level, 6)}`" class="option-heading">
            {{ formatKey(this.for) }}
        </component>

        <div
            class="option-row"
            v-for="(value, key) of data"
            :key="key"
            :class="{ 'option-row-nested': isObject(value) }"
        >
            <component
                :is="isObject(value) ? 'recursive-option' : 'label'"
                :for="key"
                :level="level + 1"
                :data="isObject(value) ? value : undefined"
                :parent="isObject(value) ? newParent(key) : undefined"
                class="option-label"
            >
                {{ formatKey(key) }}
            </component>

            <template v-if="!isObject(value)">
                <textarea
                    v-if="isMultilineField(key, value)"
                    :id="newParent(key)"
                    :name="newParent(key)"
                    rows="3"
                    class="option-input option-textarea"
                    v-model="vals[key]"
                    :placeholder="getPlaceholder(key, value)"
                ></textarea>

                <input
                    v-else
                    :id="newParent(key)"
                    :name="newParent(key)"
                    :type="getType(value)"
                    :value="getType(value) === 'checkbox' ? 'true' : vals[key] = formatInputValue(value)"
                    :checked="getType(value) === 'checkbox' ? value : false"
                    v-model="vals[key]"
                    class="option-input"
                >

                <input
                    type='hidden'
                    v-if="
                        getType(value) === 'checkbox' &&
                        (
                            vals[key] == false ||
                            (
                                typeof vals[key] === 'undefined' &&
                                value == false
                            )
                        )"
                    :name="newParent(key)"
                    value="false"
                >
            </template>
        </div>
    </section>
</template>

<script>
export default {
    name: 'recursive-option',
    props: ['for', 'level', 'data', 'parent'],

    data: function () {
        const vals = { ...this.data };

        for (const [key, value] of Object.entries(vals)) {
            if (Array.isArray(value)) {
                vals[key] = value.join('\n');
            }
        }

        return { vals };
    },

    methods: {
        getType(value) {
            switch (typeof value) {
                case 'boolean':
                    return 'checkbox';
                case 'number':
                    return 'number';
                case 'string':
                    return 'text';
                case 'object':
                    if(Array.isArray(value)) return 'text';
                default:
                    return 'text';
            }
        },

        isObject(value) {
            return typeof value === 'object' && value !== null && !Array.isArray(value);
        },

        newParent(key){
            return this.parent ? `${this.parent}$${key}` : key;
        },

        formatKey(key) {
            return String(key)
                .replace(/[_-]/g, ' ')
                .replace(/([a-z])([A-Z])/g, '$1 $2')
                .replace(/\b\w/g, character => character.toUpperCase());
        },

        formatInputValue(value) {
            if (Array.isArray(value)) {
                return value.join('\n');
            }

            return value;
        },

        isMultilineField(key, value) {
            if (Array.isArray(value)) {
                return true;
            }

            if (typeof value !== 'string') {
                return false;
            }

            const fieldPath = this.newParent(key).toLowerCase();
            return key === 'url'
                || fieldPath.includes('webhook')
                || fieldPath.includes('discord')
                || value.length > 80
                || value.includes('http');
        },

        getPlaceholder(key, value) {
            if (Array.isArray(value)) {
                return 'One webhook URL per line';
            }

            if (key === 'url' || String(key).toLowerCase().includes('url')) {
                return 'https://discord.com/api/webhooks/...';
            }

            return '';
        }
    }
};
</script>

<style scoped lang="scss">
.option-node {
    display: block;
}

.option-node-root {
    padding: 1rem;
    background: linear-gradient(180deg, #3a3430 0%, #2b2622 100%);
    border: 2px solid;
    border-color: #6b5d4f #14110f #14110f #6b5d4f;
}

.option-heading {
    margin: 0 0 0.85rem;
    color: #e8a028;
    font-family: "Oswald", sans-serif;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
}

h3.option-heading,
h4.option-heading,
h5.option-heading,
h6.option-heading {
    font-size: 1rem;
}

.option-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(220px, 36%);
    align-items: center;
    gap: 1rem;
    padding: 0.65rem 0;
    border-top: 1px solid rgba(0, 0, 0, 0.28);
}

.option-row-nested {
    display: block;
    padding-left: 1rem;
    border-left: 3px solid #c47020;
}

.option-label {
    color: #d4c4a8;
    font-weight: 600;
}

.option-input {
    width: 100%;
    min-height: 2.4rem;
}

.option-textarea {
    min-height: 4.5rem;
    resize: vertical;
    font-family: "Roboto Condensed", monospace;
    font-size: 0.88rem;
}

input[type='checkbox'].option-input {
    width: 1.25rem;
    min-height: 1.25rem;
    justify-self: end;
    accent-color: #c47020;
}

@media (max-width: 768px) {
    .option-row {
        grid-template-columns: 1fr;
        gap: 0.4rem;
    }

    .option-row-nested {
        padding-left: 0.75rem;
    }

    input[type='checkbox'].option-input {
        justify-self: start;
    }
}
</style>
