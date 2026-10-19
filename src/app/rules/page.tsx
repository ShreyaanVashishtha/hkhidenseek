import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GAME_RULES, QUESTION_OPTIONS, CURSE_DICE_OPTIONS, CURSE_DICE_COST } from "@/lib/constants";
import { PageHeader } from "@/components/PageHeader";
import { ScrollText, Coins, Zap, HelpCircle, Train, MapPin, Shield, CheckCircle2, Trophy, Clock } from "lucide-react";
import { Separator } from "@/components/ui/separator";

function RuleCard({ 
  title, 
  rules, 
  icon: Icon,
  badge 
}: { 
  title: string; 
  rules: string[] | { name: string; description: string }[]; 
  icon?: React.ElementType;
  badge?: string;
}) {
  return (
    <Card className="glass-card border-slate-800 shadow-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-lg font-bold text-white font-mono uppercase">
            {Icon && <Icon className="mr-2 h-5 w-5 text-sky-400" />}
            {title}
          </CardTitle>
          {badge && (
            <Badge variant="outline" className="text-[10px] font-mono text-sky-300 border-sky-500/40">
              {badge}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2.5 text-xs sm:text-sm text-slate-300">
          {rules.map((rule, index) => (
            <li key={index} className="flex items-start gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400 mt-2 shrink-0" />
              <div>
                {typeof rule === 'string' ? rule : (
                  <>
                    <strong className="text-white font-semibold">{rule.name}:</strong> {rule.description}
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export default function RulesPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <PageHeader 
        title="Official Rules"
        description="Comprehensive rulebook and mechanics for Jet Lag: Hong Kong MTR Hide & Seek."
        icon={ScrollText}
        badge="Season Rulebook"
      />

      {/* Intro Objective Banner */}
      <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-sky-950/80 via-slate-900 to-indigo-950/80 border border-sky-500/30 text-white shadow-xl space-y-2">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-400" />
          <h2 className="text-base sm:text-lg font-black uppercase font-mono tracking-tight text-white">
            Core Victory Condition
          </h2>
        </div>
        <p className="text-sm text-slate-200 leading-relaxed font-normal">
          {GAME_RULES.introduction} Teams rotate between hiding and seeking across rounds. The team with the <strong>longest total survival time</strong> as hiders across the match is crowned champion.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RuleCard 
          title={GAME_RULES.transport.title} 
          rules={GAME_RULES.transport.rules} 
          icon={Train} 
          badge="MTR Exclusive" 
        />
        <RuleCard 
          title={GAME_RULES.geographicScope.title} 
          rules={GAME_RULES.geographicScope.rules} 
          icon={MapPin} 
          badge="500m Territory" 
        />
      </div>

      <RuleCard 
        title={GAME_RULES.gamePhases.title} 
        rules={GAME_RULES.gamePhases.phases} 
        icon={Clock} 
        badge="60m / 120m" 
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RuleCard 
          title={GAME_RULES.hidingRules.title} 
          rules={GAME_RULES.hidingRules.rules} 
          icon={Shield} 
        />
        <RuleCard 
          title={GAME_RULES.challenges.title} 
          rules={GAME_RULES.challenges.rules} 
          icon={CheckCircle2} 
          badge="15m Freeze Penalty" 
        />
      </div>

      <RuleCard 
        title={GAME_RULES.coins.title} 
        rules={GAME_RULES.coins.rules} 
        icon={Coins} 
        badge="Economy" 
      />

      {/* Question Types & Earnings */}
      <Card className="glass-card border-slate-800 shadow-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center text-lg font-bold text-white font-mono uppercase">
              <HelpCircle className="mr-2 h-5 w-5 text-sky-400" />
              Question Types & Hider Coin Rewards
            </CardTitle>
            <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/40 text-[10px] font-mono">
              Matrix
            </Badge>
          </div>
          <CardDescription className="text-xs text-slate-300">
            {GAME_RULES.questionRules.rules.join(" ")} Seekers ask questions for free, but every query awards coins to the hiders' curse bank!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {QUESTION_OPTIONS.map((q) => {
              const Icon = q.icon || HelpCircle;
              return (
                <div key={q.id} className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="font-bold text-sm text-white font-mono">{q.name}</span>
                    </div>
                    <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[11px] font-mono font-bold">
                      +{q.hiderCoinsEarned} Coins
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-300">{q.description}</p>
                  {q.seekerPrompt && (
                    <p className="text-[11px] text-slate-400 font-mono italic">
                      e.g., {q.seekerPrompt}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Curse Dice Catalog */}
      <Card className="glass-card border-slate-800 shadow-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center text-lg font-bold text-white font-mono uppercase">
              <Zap className="mr-2 h-5 w-5 text-purple-400" />
              Hider’s Curse Dice Arsenal
            </CardTitle>
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/40 text-[10px] font-mono">
              Cost: {CURSE_DICE_COST} Coins
            </Badge>
          </div>
          <CardDescription className="text-xs text-slate-300">
            Hiders can spend {CURSE_DICE_COST} coins to roll a 6-sided die. Limit: 2 curses per round.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CURSE_DICE_OPTIONS.map((curse) => {
              const Icon = curse.icon || Zap;
              return (
                <div key={curse.number} className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-md bg-purple-600 text-white font-mono text-xs font-bold">
                        {curse.number}
                      </span>
                      <span className="font-bold text-sm text-white">{curse.name}</span>
                    </div>
                    {curse.durationMinutes && (
                      <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-700">
                        {curse.durationMinutes}m Duration
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-300">{curse.description}</p>
                  <p className="text-[11px] text-purple-300/80 font-mono font-medium">
                    Effect: {curse.effect}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <RuleCard 
        title={GAME_RULES.endgame.title} 
        rules={GAME_RULES.endgame.rules} 
        icon={Trophy} 
        badge="Victory & Rotation" 
      />
    </div>
  );
}
