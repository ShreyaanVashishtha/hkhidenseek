
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GAME_RULES, GAME_TITLE, QUESTION_OPTIONS, CURSE_DICE_OPTIONS } from "@/lib/constants";
import { PageHeader } from "@/components/PageHeader";
import { ScrollText, Coins, Zap, HelpCircle } from "lucide-react"; // Zap for Curses, HelpCircle for Questions
import { Separator } from "@/components/ui/separator";

function RuleSection({ title, rules, icon: Icon }: { title: string, rules: string[] | { name: string, description: string }[], icon?: React.ElementType }) {
  return (
    <Card className="mb-6 shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center text-xl text-primary">
          {Icon && <Icon className="mr-2 h-5 w-5" />}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="list-disc pl-5 space-y-2 text-foreground/90">
          {rules.map((rule, index) => (
            <li key={index}>
              {typeof rule === 'string' ? rule : (
                <>
                  <strong>{rule.name}:</strong> {rule.description}
                </>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export default function RulesPage() {
  return (
    <div className="space-y-8">
      <PageHeader 
        title={`${GAME_TITLE} - Rules`}
        description="Understand the mechanics and guidelines for playing."
        icon={ScrollText}
      />

      <RuleSection title={GAME_RULES.introduction} rules={[]} />
      <RuleSection title={GAME_RULES.transport.title} rules={GAME_RULES.transport.rules} />
      <RuleSection title={GAME_RULES.geographicScope.title} rules={GAME_RULES.geographicScope.rules} />
      <RuleSection title={GAME_RULES.gamePhases.title} rules={GAME_RULES.gamePhases.phases} />
      <RuleSection title={GAME_RULES.hidingRules.title} rules={GAME_RULES.hidingRules.rules} />
      <RuleSection title={GAME_RULES.challenges.title} rules={GAME_RULES.challenges.rules} />
      <RuleSection title={GAME_RULES.coins.title} rules={GAME_RULES.coins.rules} icon={Coins}/>

      <Card className="mb-6 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center text-xl text-primary">
            <HelpCircle className="mr-2 h-5 w-5" />
            Question Types
          </CardTitle>
          <CardDescription>{GAME_RULES.questionRules.rules.join(" ")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {QUESTION_OPTIONS.map((q, index) => (
            <div key={q.id}>
              <h4 className="font-semibold text-lg flex items-center">
                {q.icon && <q.icon className="mr-2 h-4 w-4 text-accent" />}
                {q.name} ({q.cost} coins)
              </h4>
              <p className="text-sm text-foreground/80 pl-6">{q.description}</p>
              {q.seekerPrompt && <p className="text-xs text-muted-foreground pl-6 mt-1">Examples: {q.seekerPrompt}</p>}
              {index < QUESTION_OPTIONS.length - 1 && <Separator className="my-3" />}
            </div>
          ))}
        </CardContent>
      </Card>
      
      <Card className="mb-6 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center text-xl text-primary">
            <Zap className="mr-2 h-5 w-5" />
            Hider’s Curse Dice
          </CardTitle>
          <CardDescription>{GAME_RULES.curseDiceRules.rules.join(" ")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {CURSE_DICE_OPTIONS.map((curse, index) => (
            <div key={curse.number}>
              <h4 className="font-semibold text-lg flex items-center">
                {curse.icon && <curse.icon className="mr-2 h-4 w-4 text-accent" />}
                {curse.number}. {curse.name}
              </h4>
              <p className="text-sm text-foreground/80 pl-6">{curse.description}</p>
              <p className="text-xs text-muted-foreground pl-6 mt-1"><strong>Effect:</strong> {curse.effect}</p>
              {index < CURSE_DICE_OPTIONS.length - 1 && <Separator className="my-3" />}
            </div>
          ))}
        </CardContent>
      </Card>

      <RuleSection title={GAME_RULES.endgame.title} rules={GAME_RULES.endgame.rules} />
    </div>
  );
}

