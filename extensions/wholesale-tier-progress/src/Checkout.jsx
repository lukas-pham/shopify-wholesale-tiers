import "@shopify/ui-extensions/preact";
import { render } from "preact";

// Shows approved wholesale buyers how close they are to the next tier.
// Reads the same metafields as the discount Function, so the bar and the discount cannot disagree on the tiers.
export default async () => {
  render(<Extension />, document.body);
};

function Extension() {
  const metafields = shopify.appMetafields.value;
  const approved = metafields.find((m) => m.target.type === "customer" && m.metafield.key === "wholesale_approved")?.metafield.value === "true";
  const tiers = parseTiers(metafields.find((m) => m.target.type === "shop" && m.metafield.key === "wholesale_tiers")?.metafield.value);
  if (!approved || !tiers.length) return null;

  const units = shopify.lines.value.reduce((sum, line) => sum + line.quantity, 0);
  const current = [...tiers].reverse().find((t) => units >= t.minQuantity);
  const next = tiers.find((t) => units < t.minQuantity);
  const t = shopify.i18n.translate;
  // translate() may return an array when values contain elements; labels need a plain string.
  const nextText = next ? String(t("next", { missing: next.minQuantity - units, percentage: next.percentage })) : "";

  return (
    <s-banner heading={t("heading")} tone={current ? "success" : "info"}>
      <s-stack gap="small-200">
        {current ? <s-text>{t("active", { percentage: current.percentage, units })}</s-text> : <s-text>{t("start", { units: tiers[0].minQuantity, percentage: tiers[0].percentage })}</s-text>}
        {next ? (
          <>
            <s-progress value={units} max={next.minQuantity} accessibilityLabel={nextText} />
            <s-text color="subdued">{nextText}</s-text>
          </>
        ) : (
          <s-text color="subdued">{t("top")}</s-text>
        )}
      </s-stack>
    </s-banner>
  );
}

function parseTiers(value) {
  try {
    const list = JSON.parse(value ?? "{}").tiers;
    return Array.isArray(list) ? list.filter((x) => Number.isInteger(x.minQuantity) && x.percentage > 0 && x.percentage <= 50).sort((a, b) => a.minQuantity - b.minQuantity) : [];
  } catch {
    return [];
  }
}
