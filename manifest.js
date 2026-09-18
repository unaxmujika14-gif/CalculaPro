(function () {
  "use strict";
  window.__BRAND__ = {
    name: "CalculaPro",
    tagline: "Calculadoras financieras claras, rápidas y gratis",
    year: 2026,
    nav: [
      { href: "index.html", label: "Hipoteca" },
      { href: "prestamo-personal.html", label: "Préstamo personal" },
      { href: "interes-compuesto.html", label: "Interés compuesto" }
    ],
    tools: [
      {
        id: "hipoteca",
        href: "index.html",
        title: "Calculadora de hipoteca",
        desc: "Cuota mensual, intereses totales y tabla de amortización de tu préstamo hipotecario."
      },
      {
        id: "prestamo-personal",
        href: "prestamo-personal.html",
        title: "Calculadora de préstamo personal",
        desc: "Cuánto pagarás cada mes por un préstamo personal, coche o reforma."
      },
      {
        id: "interes-compuesto",
        href: "interes-compuesto.html",
        title: "Calculadora de interés compuesto",
        desc: "Cómo crece tu ahorro o inversión mes a mes con aportaciones periódicas."
      }
    ],
    faqsHipoteca: [
      {
        q: "¿Cómo se calcula la cuota mensual de una hipoteca?",
        a: "Se usa el sistema de amortización francés: la cuota es constante cada mes, pero al principio pagas más intereses y menos capital, y con el tiempo la proporción se invierte. La fórmula es cuota = P × r / (1 − (1+r)⁻ⁿ), donde P es el capital pedido, r el interés mensual y n el número total de meses."
      },
      {
        q: "¿Qué diferencia hay entre TIN y TAE?",
        a: "El TIN (Tipo de Interés Nominal) es el interés puro del préstamo. La TAE (Tasa Anual Equivalente) añade comisiones y gastos, por eso siempre es igual o mayor que el TIN y es la cifra más fiable para comparar ofertas de distintos bancos."
      },
      {
        q: "¿Qué pasa si amortizo capital anticipadamente?",
        a: "Al reducir el capital pendiente, pagas menos intereses en lo que queda de hipoteca. Puedes elegir entre reducir la cuota mensual (misma duración, pagas menos cada mes) o reducir el plazo (misma cuota, terminas antes). Esta calculadora no simula amortizaciones parciales, pero puedes comparar dos escenarios distintos cambiando el capital o el plazo."
      },
      {
        q: "¿Es mejor una hipoteca fija o variable?",
        a: "La fija mantiene la misma cuota durante toda la vida del préstamo, dando seguridad frente a subidas de tipos. La variable suele empezar con un interés más bajo (referenciado al Euríbor + diferencial) pero puede subir o bajar con el tiempo. La calculadora asume un tipo fijo; para una variable, prueba distintos escenarios de interés para ver el rango de cuotas posible."
      },
      {
        q: "¿Cuánto tengo que ahorrar antes de pedir una hipoteca?",
        a: "Lo habitual en España es que los bancos financien hasta el 80% del valor de tasación de la vivienda habitual, por lo que necesitarás cubrir al menos el 20% restante más los gastos de compraventa (notaría, registro, impuestos), que suelen rondar otro 10-12% adicional."
      },
      {
        q: "¿Qué es la tabla de amortización?",
        a: "Es el desglose mes a mes de tu hipoteca: cuánto de cada cuota va a capital y cuánto a intereses, y cuánto capital te queda pendiente. Al principio del préstamo la mayor parte de la cuota son intereses; con los años esa proporción se invierte."
      },
      {
        q: "¿Este cálculo tiene en cuenta comisiones o seguros obligatorios?",
        a: "No. Esta calculadora estima la cuota pura de capital e intereses según el TIN que introduzcas. Si tu banco exige seguro de hogar, de vida o comisión de apertura, súmalos aparte para conocer el coste real mensual."
      },
      {
        q: "¿Puedo usar esta calculadora para un local comercial o segunda vivienda?",
        a: "Sí, la fórmula matemática es la misma. Ten en cuenta que los bancos suelen exigir más entrada (a veces el 100%) y ofrecer peores condiciones para segundas viviendas o inmuebles no destinados a vivienda habitual."
      }
    ],
    faqsPrestamo: [
      {
        q: "¿Cómo se calcula la cuota de un préstamo personal?",
        a: "Igual que una hipoteca: sistema de amortización francés, con cuota fija cada mes. La fórmula es cuota = P × r / (1 − (1+r)⁻ⁿ), donde P es el importe solicitado, r el interés mensual y n el número de cuotas."
      },
      {
        q: "¿Qué interés es normal en un préstamo personal en España?",
        a: "Suele moverse entre el 6% y el 15% TAE dependiendo del banco, tu perfil de riesgo, el importe y el plazo. Los préstamos sin nómina domiciliada o de importes pequeños suelen tener el interés más alto."
      },
      {
        q: "¿Merece la pena cancelar un préstamo antes de tiempo?",
        a: "Casi siempre reduce el total de intereses pagados, porque dejas de generar interés sobre el capital ya devuelto. Revisa si tu contrato incluye comisión por amortización anticipada (en préstamos personales suele ser baja o inexistente por ley)."
      },
      {
        q: "¿Cuánto plazo es razonable para un préstamo personal?",
        a: "Cuanto más corto, menos intereses totales pagas, pero la cuota mensual sube. Lo habitual es entre 12 y 84 meses. Usa el comparador de esta calculadora para ver el equilibrio entre cuota mensual y coste total en distintos plazos."
      },
      {
        q: "¿Un préstamo personal afecta a mi capacidad de pedir una hipoteca?",
        a: "Sí. Los bancos suman todas tus cuotas de deuda (préstamos, tarjetas, hipoteca) y normalmente no permiten que superen el 30-35% de tus ingresos netos, así que un préstamo personal activo reduce el importe de hipoteca que te concederán."
      },
      {
        q: "¿Qué diferencia hay entre TIN y TAE en un préstamo personal?",
        a: "El TIN es el interés nominal puro; la TAE incluye además comisiones (de apertura, de estudio) y el efecto de la periodicidad de los pagos, por lo que siempre es la cifra que debes comparar entre ofertas."
      }
    ],
    faqsInteres: [
      {
        q: "¿Qué es el interés compuesto?",
        a: "Es el interés que se calcula no solo sobre el capital inicial, sino también sobre los intereses ya generados en periodos anteriores. Por eso el crecimiento se acelera con el tiempo: es literalmente \"interés sobre interés\"."
      },
      {
        q: "¿Cómo afectan las aportaciones periódicas al resultado?",
        a: "Cada aportación adicional empieza a generar sus propios intereses desde el momento en que la haces, así que aportar de forma constante (aunque sea poco) suele pesar más a largo plazo que una única aportación grande al principio."
      },
      {
        q: "¿Qué rentabilidad anual es realista para simular?",
        a: "Depende del producto: una cuenta remunerada o depósito puede rondar el 1-3% anual, un fondo indexado diversificado a largo plazo históricamente ha rondado el 5-8% anual de media (con años muy por encima y otros negativos), y la renta variable individual puede ser mucho más volátil. Ninguna rentabilidad futura está garantizada."
      },
      {
        q: "¿Cada cuánto se capitaliza el interés en esta calculadora?",
        a: "Esta calculadora capitaliza mensualmente: cada mes se suman los intereses generados al capital acumulado antes de calcular el siguiente periodo, y después se añade tu aportación periódica si la has indicado."
      },
      {
        q: "¿Qué es la regla del 72?",
        a: "Una forma rápida de estimar cuánto tarda tu dinero en duplicarse: divide 72 entre el porcentaje de rentabilidad anual. Al 6% anual, por ejemplo, tardarías aproximadamente 72 ÷ 6 = 12 años en duplicar el capital, sin contar aportaciones adicionales."
      },
      {
        q: "¿Esta calculadora tiene en cuenta la inflación o los impuestos?",
        a: "No. Muestra el crecimiento nominal del capital según la rentabilidad que introduzcas. La inflación reduce el poder adquisitivo real de ese dinero, y en España las ganancias suelen tributar en la base del ahorro del IRPF al retirarlas; ninguno de los dos efectos está incluido en el cálculo."
      }
    ],
    legal: {
      email: "hola@TU-DOMINIO-AQUI.com",
      nombreLegal: "[Nombre y apellidos / razón social del titular]",
      nif: "[NIF / CIF]",
      direccion: "[Dirección postal completa]"
    }
  };
})();
