import { computed, ComputedRef } from "vue";
import { defineStore } from "pinia";
import { createResource } from "frappe-ui";
import { useTitle } from "@vueuse/core";
import { socket } from "@/socket";

const URI_CONFIG = "helpdesk.api.config.get_config";
const DEFAULT_TITLE = "Helpdesk";

export const useConfigStore = defineStore("config", () => {
	const configRes = createResource({
		url: URI_CONFIG,
		auto: true,
	});

	const config = computed(() => configRes.data || {});
	const helpdeskName: ComputedRef<string> = computed(
		() => config.value.helpdesk_name || DEFAULT_TITLE
	);
	const suppressEmailToast: ComputedRef<boolean> = computed(
		() => config.value.suppress_default_email_toast ?? true
	);

	useTitle(helpdeskName);

	socket.on("helpdesk:settings-updated", () => configRes.reload());

	return {
		config,
		helpdeskName,
		suppressEmailToast,
	};
});
