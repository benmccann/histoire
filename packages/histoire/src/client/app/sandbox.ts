import './style/sandbox.css'
import { parseQuery } from 'vue-router'
import { computed, createApp, h, ref, toRaw, watch } from 'vue'
import { createPinia } from 'pinia'
import { registerGlobalComponents } from './global-components'
import SandboxVue3 from './components/sandbox/SandboxVue3.vue'
import type { StoryFile } from './types'
import { mapFile } from './util/mapping'
// @ts-expect-error virtual module
import { files } from '$histoire-stories'
import { PREVIEW_SETTINGS_SYNC, STATE_SYNC } from './util/const.js'
import { applyPreviewSettings } from './util/preview-settings.js'
import { isDark } from './util/dark.js'
import { histoireConfig } from './util/config.js'

const query = parseQuery(window.location.search)
const file = ref<StoryFile>(mapFile(files.find(f => f.id === query.storyId)))

const app = createApp({
  setup () {
    const story = computed(() => file.value.story)
    const variant = computed(() => story.value?.variants.find(v => v.id === query.variantId))

    let synced = false

    window.addEventListener('message', event => {
      if (event.data?.type === STATE_SYNC) {
        synced = true
        Object.assign(variant.value.state, event.data.state)
      } else if (event.data?.type === PREVIEW_SETTINGS_SYNC) {
        applyPreviewSettings(event.data.settings)
      }
    })

    watch(() => variant.value.state, value => {
      if (synced) {
        synced = false
        return
      }
      window.parent?.postMessage({
        type: STATE_SYNC,
        state: toRaw(value),
      })
    }, {
      deep: true,
    })

    return {
      story,
      variant,
    }
  },

  render () {
    return [
      h('div', { class: 'htw-sandbox-hidden' }, [
        h(file.value.component, {
          story: file.value.story,
        }),
      ]),
      this.story && this.variant
        ? h(SandboxVue3, {
          story: this.story,
          variant: this.variant,
        })
        : null,
    ]
  },
})
app.use(createPinia())
registerGlobalComponents(app)
app.mount('#app')

watch(isDark, value => {
  if (value) {
    document.documentElement.classList.add(histoireConfig.sandboxDarkClass)
  } else {
    document.documentElement.classList.remove(histoireConfig.sandboxDarkClass)
  }
}, {
  immediate: true,
})
