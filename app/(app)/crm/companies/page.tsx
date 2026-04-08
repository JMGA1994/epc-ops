import { prisma } from "@/lib/prisma";
import { CompanyStatusBadge } from "@/components/crm/CompanyStatusBadge";
import { formatDate } from "@/lib/utils/dates";
import Link from "next/link";
import { Plus, Building2 } from "lucide-react";

export default async function CompaniesPage() {
  const companies = await prisma.company.findMany({
    where: { deleted_at: null },
    include: {
      _count: { select: { contacts: true, deals: true, interactions: true } },
    },
    orderBy: { updated_at: "desc" },
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Empresas</h1>
          <p className="text-sm text-gray-500">{companies.length} empresas</p>
        </div>
        <Link
          href="/crm/companies/new"
          className="flex items-center gap-1.5 rounded-md bg-amber-500 px-3 py-2 text-sm font-medium text-white hover:bg-amber-600 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nueva empresa
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Empresa</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">País</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Estado</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Contactos</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Deals</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">NDA</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Actualizado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {companies.map((company) => (
              <tr key={company.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <Link
                    href={`/crm/companies/${company.id}`}
                    className="flex items-center gap-2 font-medium text-gray-900 hover:text-amber-600"
                  >
                    <Building2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    {company.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{company.country}</td>
                <td className="px-4 py-3">
                  <CompanyStatusBadge status={company.status} />
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{company._count.contacts}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{company._count.deals}</td>
                <td className="px-4 py-3">
                  {company.nda_signed ? (
                    <span className="text-xs text-green-600 font-medium">
                      ✓ {formatDate(company.nda_signed_date)}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-gray-400">
                  {formatDate(company.updated_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {companies.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-400">
            No hay empresas aún. Crea la primera.
          </div>
        )}
      </div>
    </div>
  );
}
