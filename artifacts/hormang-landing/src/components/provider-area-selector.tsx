/**
 * ProviderAreaSelector
 * Two-group accordion for provider service area selection.
 * Groups: Toshkent shahri (districts) + Toshkent viloyati (cities).
 * Supports "Select All", individual multi-select, and combination coverage.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, MapPin, CheckSquare, Square, Building2, Map } from "lucide-react";
import { TOSHKENT_DISTRICTS, regionsList, getDistrictLabel, getRegionLabel } from "@/lib/regions";
import { type ProviderServiceArea, emptyProviderServiceArea, isServiceAreaEmpty } from "@/lib/matching";
import { useI18n } from "@/contexts/i18n-context";
import { tFormat } from "@/lib/i18n";

export type { ProviderServiceArea };

const VILOYAT_CITIES = regionsList.filter((r) => !r.isCapital).map((r) => r.value);

interface GroupProps {
  title: string;
  icon: React.ReactNode;
  colorClass: string;
  isAll: boolean;
  selected: string[];
  items: string[];
  itemLabels?: string[];
  onAllChange: (v: boolean) => void;
  onItemChange: (item: string, checked: boolean) => void;
}

function CheckItem({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm text-left transition-all ${
        checked
          ? "bg-violet-50 border border-violet-300 text-violet-800 font-semibold"
          : "bg-gray-50 border border-gray-200 text-gray-600 hover:border-violet-200 hover:bg-violet-50/50"
      }`}
    >
      {checked ? (
        <CheckSquare className="w-4 h-4 text-violet-600 flex-shrink-0" />
      ) : (
        <Square className="w-4 h-4 text-gray-400 flex-shrink-0" />
      )}
      <span>{label}</span>
    </button>
  );
}

function Group({ title, icon, colorClass, isAll, selected, items, itemLabels, onAllChange, onItemChange }: GroupProps) {
  const { t } = useI18n();
  const tt = t.providerAreaSelector;
  const [open, setOpen] = useState(true);
  const count = isAll ? items.length : selected.length;

  const badge = isAll
    ? <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${colorClass}`}>{tt.allAreas}</span>
    : count > 0
      ? <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${colorClass}`}>{count} {tt.countSuffix}</span>
      : null;

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-3 w-full px-4 py-3.5 bg-white hover:bg-gray-50 transition-colors"
      >
        <span className="text-lg">{icon}</span>
        <span className="font-bold text-sm text-gray-800 flex-1 text-left">{title}</span>
        {badge}
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 space-y-2 border-t border-gray-100 bg-gray-50/50">
              {/* Select All row */}
              <button
                type="button"
                onClick={() => onAllChange(!isAll)}
                className={`flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-sm font-bold transition-all border-2 ${
                  isAll
                    ? "border-violet-500 bg-violet-600 text-white shadow-sm"
                    : "border-dashed border-gray-300 text-gray-500 hover:border-violet-300 hover:bg-violet-50 bg-white"
                }`}
              >
                {isAll ? (
                  <CheckSquare className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <Square className="w-4 h-4 flex-shrink-0" />
                )}
                {tt.selectAll}
              </button>

              {/* Individual items — disabled (greyed) when "all" is active */}
              {!isAll && (
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  {items.map((item, i) => (
                    <CheckItem
                      key={item}
                      label={itemLabels?.[i] ?? item}
                      checked={selected.includes(item)}
                      onChange={(v) => onItemChange(item, v)}
                    />
                  ))}
                </div>
              )}

              {isAll && (
                <p className="text-xs text-violet-600 px-1 pb-1">
                  {tt.allCovered}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────── */

interface ProviderAreaSelectorProps {
  value: ProviderServiceArea;
  onChange: (v: ProviderServiceArea) => void;
}

export function ProviderAreaSelector({ value, onChange }: ProviderAreaSelectorProps) {
  const { t, locale } = useI18n();
  const tt = t.providerAreaSelector;
  const area = value ?? emptyProviderServiceArea();
  const empty = isServiceAreaEmpty(area);

  function setCity(patch: Partial<ProviderServiceArea["toshkent_city"]>) {
    onChange({ ...area, toshkent_city: { ...area.toshkent_city, ...patch } });
  }
  function setRegion(patch: Partial<ProviderServiceArea["toshkent_region"]>) {
    onChange({ ...area, toshkent_region: { ...area.toshkent_region, ...patch } });
  }

  function toggleCityDistrict(item: string, checked: boolean) {
    const next = checked
      ? [...area.toshkent_city.districts, item]
      : area.toshkent_city.districts.filter((d) => d !== item);
    setCity({ districts: next });
  }

  function toggleRegionCity(item: string, checked: boolean) {
    const next = checked
      ? [...area.toshkent_region.cities, item]
      : area.toshkent_region.cities.filter((c) => c !== item);
    setRegion({ cities: next });
  }

  const parts: string[] = [];
  if (area.toshkent_city.all) parts.push(tt.summaryAllCity);
  else if (area.toshkent_city.districts.length > 0) parts.push(tFormat(tt.summaryCityCountTpl, { n: area.toshkent_city.districts.length }));
  if (area.toshkent_region.all) parts.push(tt.summaryAllRegion);
  else if (area.toshkent_region.cities.length > 0) parts.push(tFormat(tt.summaryRegionCountTpl, { n: area.toshkent_region.cities.length }));

  return (
    <div className="space-y-3">
      <Group
        title={tt.toshkentCity}
        icon={<Building2 className="w-4 h-4 text-violet-600" />}
        colorClass="bg-violet-100 text-violet-700"
        isAll={area.toshkent_city.all}
        selected={area.toshkent_city.districts}
        items={TOSHKENT_DISTRICTS}
        itemLabels={TOSHKENT_DISTRICTS.map((d) => getDistrictLabel(d, locale))}
        onAllChange={(v) => setCity({ all: v, districts: [] })}
        onItemChange={toggleCityDistrict}
      />

      <Group
        title={tt.toshkentRegion}
        icon={<Map className="w-4 h-4 text-blue-600" />}
        colorClass="bg-blue-100 text-blue-700"
        isAll={area.toshkent_region.all}
        selected={area.toshkent_region.cities}
        items={VILOYAT_CITIES}
        itemLabels={VILOYAT_CITIES.map((c) => getRegionLabel(c, locale))}
        onAllChange={(v) => setRegion({ all: v, cities: [] })}
        onItemChange={toggleRegionCity}
      />

      {/* Summary bar */}
      {!empty ? (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-green-50 border border-green-200">
          <MapPin className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs font-semibold text-green-800">{parts.join(" · ")}</p>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-50 border border-red-200">
          <MapPin className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-xs font-semibold text-red-700">
            {tt.warningEmpty}
          </p>
        </div>
      )}
    </div>
  );
}
