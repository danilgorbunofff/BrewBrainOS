const fs = require('fs');

const file = 'src/components/InventoryTable.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `      <TableCell className="py-6 px-8">
        <Link href={\`/inventory/\${item.id}\`} className="flex items-center gap-3 font-black text-lg tracking-tight text-foreground group-hover:text-primary transition-colors hover:underline">
          {isLowStock && <LucideAlertCircle className="h-5 w-5 text-primary animate-pulse" />}
          {expirationStatus?.type === 'expired' && <LucideAlertCircle className="h-5 w-5 text-red-500 animate-pulse" />}
          {expirationStatus?.type === 'expiring' && <LucideAlertCircle className="h-5 w-5 text-yellow-500 animate-pulse" />}
          {item.name}
        </Link>
      </TableCell>`;

const replacement = `      <TableCell className="py-6 px-8">
        <div className="space-y-1">
          <Link href={\`/inventory/\${item.id}\`} className="flex items-center gap-3 font-black text-lg tracking-tight text-foreground group-hover:text-primary transition-colors hover:underline">
            {isLowStock && <LucideAlertCircle className="h-5 w-5 text-primary animate-pulse" />}
            {expirationStatus?.type === 'expired' && <LucideAlertCircle className="h-5 w-5 text-red-500 animate-pulse" />}
            {expirationStatus?.type === 'expiring' && <LucideAlertCircle className="h-5 w-5 text-yellow-500 animate-pulse" />}
            {item.name}
          </Link>
          {(item.lot_number || item.manufacturer) && (
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground font-black pl-[32px]">
              {item.lot_number && <span className="font-mono bg-secondary/50 px-1.5 py-0.5 rounded border border-border/50">Lot: {item.lot_number}</span>}
              {item.manufacturer && <span>Mfg: {item.manufacturer}</span>}
            </div>
          )}
        </div>
      </TableCell>`;

content = content.replace(target, replacement);

fs.writeFileSync(file, content);
console.log('updated table');
